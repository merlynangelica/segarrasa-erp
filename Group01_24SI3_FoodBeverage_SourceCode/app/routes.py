"""API SegarRasa ERP — seluruh aturan bisnis SR-01..SR-20 ditegakkan di sini (bukan di UI)."""
from functools import wraps
from flask import Blueprint, request, jsonify, session, g
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import timedelta, date
from .db import (now_wib, get_db, next_number, audit, tax_of, half_up, setting, begin, stock_move,
                 post_journal, RESET_TABLES, seed_db)
from .auth import (require, allowed, deny, APPS, permissions_for, current_permissions, check_active,
                   CATALOG, ALL_PERMS, DEFAULT_PERMISSIONS, effective_permissions, level)
from fractions import Fraction

bp = Blueprint("api", __name__, url_prefix="/api")


# ---------------------------------------------------------------- helpers
def ok(data=None, status=200):
    return jsonify(data if data is not None else {"ok": True}), status


def err(msg, status=400, **extra):
    return jsonify({"error": msg, **extra}), status


def rowdicts(rows):
    return [dict(r) for r in rows]


def user():
    return session.get("user", {}).get("username", "system")


def role():
    return session.get("user", {}).get("role")


def idr(n):
    return "Rp" + f"{int(n or 0):,}".replace(",", ".")


def money(n):  # dipakai endpoint analisis tim
    return half_up(Fraction(str(n)))


def as_int(value, name="nilai"):
    """Validasi bilangan bulat ketat: menolak bool, desimal, teks."""
    if isinstance(value, bool):
        raise ValueError(f"{name} harus bilangan bulat")
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and value.strip().lstrip("-").isdigit():
        return int(value.strip())
    raise ValueError(f"{name} harus bilangan bulat")


def blocked(action, ref, details, msg, status=409, **extra):
    """Tolak aksi dan tetap simpan jejak percobaan di audit (bukti T-10, T-18, T-22, T-24)."""
    g.setdefault("pending_audit", []).append((user(), action, ref, details))
    return err(msg, status, **extra)


def tx(fn):
    """Satu request tulis = satu transaksi BEGIN IMMEDIATE. Gagal -> rollback total."""
    @wraps(fn)
    def wrapped(*a, **kw):
        db = get_db()
        begin(db)
        try:
            resp = fn(*a, **kw)
        except ValueError as e:
            db.rollback()
            resp = err(str(e), 400)
        except Exception:
            db.rollback()
            raise
        status = resp[1] if isinstance(resp, tuple) else resp.status_code
        if status >= 400:
            db.rollback()
        else:
            db.commit()
        pending = g.pop("pending_audit", [])
        if pending:
            for p in pending:
                audit(*p)
            db.commit()
        return resp
    return wrapped


def body():
    d = request.get_json(silent=True)
    return d if isinstance(d, dict) else {}


def one(sql, args=()):
    return get_db().execute(sql, args).fetchone()


def scalar(sql, args=()):
    r = get_db().execute(sql, args).fetchone()
    return (r[0] if r and r[0] is not None else 0)


# ---------------------------------------------------------------- stock helpers
def reserved_qty(sku, wh, exclude_doc=None):
    sql = "SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE sku=? AND warehouse_code=? AND active=1"
    args = [sku, wh]
    if exclude_doc:
        sql += " AND document_no<>?"
        args.append(exclude_doc)
    return scalar(sql, args)


def on_hand(sku, wh):
    return scalar("SELECT on_hand FROM stock WHERE sku=? AND warehouse_code=?", (sku, wh))


def available(sku, wh):
    return on_hand(sku, wh) - reserved_qty(sku, wh)


def add_stock(sku, wh, qty):
    get_db().execute("INSERT INTO stock(sku,warehouse_code,on_hand) VALUES(?,?,?) ON CONFLICT(sku,warehouse_code) "
                     "DO UPDATE SET on_hand=on_hand+excluded.on_hand", (sku, wh, qty))


def delivered_qty(order_id, sku, status="Done"):
    return scalar("SELECT COALESCE(SUM(dl.quantity),0) FROM delivery_lines dl JOIN deliveries d ON d.id=dl.delivery_id "
                  "WHERE d.order_id=? AND d.status=? AND dl.sku=?", (order_id, status, sku))


def invoiced_qty(order_id, sku, statuses=("Draft", "Posted")):
    q = ",".join("?" * len(statuses))
    return scalar(f"SELECT COALESCE(SUM(il.quantity),0) FROM invoice_lines il JOIN invoices i ON i.id=il.invoice_id "
                  f"WHERE i.order_id=? AND il.sku=? AND i.status IN ({q})", (order_id, sku, *statuses))


def returned_qty(order_id, sku, statuses=("Requested", "Inspected", "Received", "Done")):
    q = ",".join("?" * len(statuses))
    return scalar(f"SELECT COALESCE(SUM(r.quantity),0) FROM returns r JOIN invoices i ON i.id=r.invoice_id "
                  f"WHERE i.order_id=? AND r.sku=? AND r.status IN ({q})", (order_id, sku, *statuses))


# ---------------------------------------------------------------- credit exposure (SR-09, F-02, F-10)
def credit_info(code, extra=0):
    db = get_db()
    c = one("SELECT * FROM customers WHERE code=?", (code,))
    if not c:
        return None
    open_invoices = scalar("SELECT COALESCE(SUM(i.total-i.paid_amount-i.credited_amount),0) FROM invoices i "
                           "JOIN sales_orders s ON s.id=i.order_id WHERE s.customer_code=? AND i.status='Posted'", (code,))
    # payment terhadap opening AR tidak dimodelkan; opening AR tetap terbuka
    ar_open = c["opening_ar"] + open_invoices
    uninvoiced = 0
    sos = []
    for so in db.execute("SELECT * FROM sales_orders WHERE customer_code=? AND status='Confirmed'", (code,)):
        posted = scalar("SELECT COALESCE(SUM(total),0) FROM invoices WHERE order_id=? AND status='Posted'", (so["id"],))
        part = max(0, so["total"] - posted)  # bagian yang sudah ditagih tidak dihitung dua kali
        if part:
            sos.append({"number": so["number"], "id": so["id"], "uninvoiced": part})
        uninvoiced += part
    exposure = ar_open + uninvoiced
    return {"customer_code": code, "customer_name": c["name"], "credit_limit": c["credit_limit"],
            "payment_terms": c["payment_terms"], "opening_ar": c["opening_ar"], "open_invoice_ar": open_invoices,
            "ar_open": ar_open, "confirmed_uninvoiced": uninvoiced, "uninvoiced_orders": sos,
            "exposure": exposure, "headroom": c["credit_limit"] - exposure,
            "exposure_after": exposure + extra, "headroom_after": c["credit_limit"] - exposure - extra}


# ---------------------------------------------------------------- auth
@bp.post("/login")
def login():
    d = body()
    db = get_db()
    uname = str(d.get("username", "")).strip()
    r = one("SELECT * FROM users WHERE username=?", (uname,))
    ip, ua = request.remote_addr, (request.headers.get("User-Agent") or "")[:120]
    if not r or not check_password_hash(r["password_hash"], d.get("password", "")):
        audit(uname or "?", "Login failed", None, "Invalid credentials")
        db.execute("INSERT INTO login_history(username,success,ip,user_agent,note) VALUES(?,0,?,?,?)",
                   (uname or "?", ip, ua, "Password/username salah"))
        db.commit()
        return err("Username atau password salah", 401)
    if not r["active"]:
        db.execute("INSERT INTO login_history(username,success,ip,user_agent,note) VALUES(?,0,?,?,?)",
                   (uname, ip, ua, "Akun nonaktif"))
        audit(uname, "Login failed", None, "Akun nonaktif")
        db.commit()
        return err("Akun dinonaktifkan. Hubungi Master Admin.", 403)
    session.clear()
    session["user_id"] = r["id"]
    session["user"] = {"username": r["username"], "name": r["full_name"], "role": r["role"], "level": r["level"] or "Manager"}
    audit(r["username"], "Login", None, r["role"])
    db.execute("INSERT INTO login_history(username,success,ip,user_agent,note) VALUES(?,1,?,?,?)",
               (uname, ip, ua, r["role"]))
    db.execute("UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?", (r["id"],))
    db.commit()
    return ok({"user": session["user"]})


@bp.post("/logout")
def logout():
    if session.get("user"):
        audit(user(), "Logout")
        get_db().commit()
    session.clear()
    return ok()


@bp.get("/me")
@require("dashboard.view")
def me():
    apps = [a for a in APPS if allowed(a["perm"])]
    perms = sorted(current_permissions())
    return ok({"user": session["user"], "permissions": perms, "apps": apps})


# ---------------------------------------------------------------- dashboard (SR-19, F-19)
def so_open(so):
    if so["status"] in ("Quotation", "Pending Approval"):
        return True
    if so["status"] != "Confirmed":
        return False
    for l in get_db().execute("SELECT * FROM sales_order_lines WHERE order_id=?", (so["id"],)):
        if invoiced_qty(so["id"], l["sku"], ("Posted",)) < l["quantity"]:
            return True
    return False


def po_open(po):
    if po["status"] in ("RFQ", "Pending Approval"):
        return True
    if po["status"] != "Confirmed":
        return False
    for l in get_db().execute("SELECT * FROM purchase_order_lines WHERE order_id=?", (po["id"],)):
        rec = scalar("SELECT COALESCE(SUM(rl.received_qty),0) FROM receipt_lines rl JOIN receipts r ON r.id=rl.receipt_id "
                     "WHERE r.purchase_order_id=? AND rl.sku=? AND r.status='Done'", (po["id"], l["sku"]))
        if rec < l["quantity"]:
            return True
    return False


def account_balance(code, exclude_opening=False):
    sql = "SELECT COALESCE(SUM(jl.debit-jl.credit),0) FROM journal_lines jl JOIN journal_entries j ON j.id=jl.journal_id " \
          "WHERE jl.account_code=? AND j.status='Posted'"
    if exclude_opening:
        sql += " AND j.source_type<>'Opening'"
    return scalar(sql, (code,))


@bp.get("/dashboard")
@require("dashboard.view")
def dashboard():
    db = get_db()
    onhand = scalar("SELECT COALESCE(SUM(on_hand),0) FROM stock")
    reserved = scalar("SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE active=1")
    stockvalue = scalar("SELECT COALESCE(SUM(s.on_hand*p.standard_cost),0) FROM stock s JOIN products p ON p.sku=s.sku")
    sos = db.execute("SELECT * FROM sales_orders").fetchall()
    pos = db.execute("SELECT * FROM purchase_orders").fetchall()
    data = {
        "company": "PT Segar Rasa Riau", "currency": "IDR", "data_cutoff": "Live (baseline seed + transaksi)",
        "on_hand": onhand, "reserved": reserved, "available": onhand - reserved, "stock_value": stockvalue,
        "stock_by_warehouse": rowdicts(db.execute(
            "SELECT s.warehouse_code, SUM(s.on_hand) units, SUM(s.on_hand*p.standard_cost) value FROM stock s "
            "JOIN products p ON p.sku=s.sku GROUP BY s.warehouse_code ORDER BY s.warehouse_code")),
        "open_sales_orders": sum(1 for s in sos if so_open(s)),
        "open_purchase_orders": sum(1 for p in pos if po_open(p)),
        "open_leads": scalar("SELECT COUNT(*) FROM leads WHERE stage NOT IN ('Won','Lost')"),
        "sales_orders": len(sos), "purchase_orders": len(pos),
        "pending_approvals": scalar("SELECT COUNT(*) FROM purchase_orders WHERE status='Pending Approval'")
                             + scalar("SELECT COUNT(*) FROM sales_orders WHERE status='Pending Approval'"),
        "receipts_waiting_qc": scalar("SELECT COUNT(*) FROM receipts WHERE status='Waiting'"),
        "recent_audit": rowdicts(db.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 8")),
        "finance_visible": allowed("reports.view") or allowed("accounting.view"),
    }
    if data["finance_visible"]:
        revenue = -(account_balance("4100", True) + account_balance("4110", True))
        data.update({
            "revenue_posted": revenue,
            "invoices_posted": scalar("SELECT COUNT(*) FROM invoices WHERE status='Posted'"),
            "invoices_posted_amount": scalar("SELECT COALESCE(SUM(total),0) FROM invoices WHERE status='Posted'"),
            "ar": account_balance("1100"), "ap": -account_balance("2100"), "bank": account_balance("1010"),
            "inventory_ledger": account_balance("1200"), "grni": -account_balance("1210"),
            "vat_output": -account_balance("2200"), "vat_input": account_balance("1300"),
            "uninvoiced_confirmed": sum(credit_info(c["code"])["confirmed_uninvoiced"]
                                        for c in db.execute("SELECT code FROM customers")),
        })
    return ok(data)


# ---------------------------------------------------------------- masters
@bp.get("/masters/<kind>")
def masters(kind):
    if not check_active():
        return err("Authentication required", 401)
    perm = {"customers": ["contacts.view", "sales.view", "invoicing.view"],
            "vendors": ["contacts.view", "purchase.view", "bills.view"], "products": ["products.view"],
            "warehouses": ["dashboard.view"], "accounts": ["accounting.view"],
            "users": ["admin.users"], "pricelist": ["purchase.view", "vendors.manage"]}.get(kind)
    if not perm:
        return err("Unknown master", 404)
    if not any(allowed(p) for p in perm):
        return deny(perm[0])
    db = get_db()
    if kind == "users":
        rows = db.execute("SELECT id,username,full_name,role,email,active,last_login FROM users")
    elif kind == "customers":
        rows = db.execute("SELECT * FROM customers ORDER BY code")
    elif kind == "products":
        rows = db.execute("SELECT * FROM products ORDER BY sku")
    elif kind == "pricelist":
        rows = db.execute("SELECT * FROM vendor_pricelist ORDER BY vendor_code, sku")
    else:
        rows = db.execute(f"SELECT * FROM {kind}")
    return ok(rowdicts(rows))


@bp.post("/masters/products")
@require("products.manage")
@tx
def create_product():
    """SR-17: tiap variant SKU unik. Duplikat ditolak dan master tidak berubah (T-06)."""
    d = body()
    sku = str(d.get("sku", "")).strip().upper()
    if not sku or not d.get("name") or not d.get("unit"):
        return err("SKU, nama, dan satuan wajib diisi")
    if one("SELECT 1 FROM products WHERE sku=?", (sku,)):
        return blocked("Blocked duplicate SKU", sku, f"Percobaan membuat SKU {sku} ({d.get('size')})",
                       f"SKU {sku} sudah ada. Setiap varian ukuran/rasa wajib memakai SKU unik (SR-17).")
    price = as_int(d.get("sales_price"), "Sales price")
    cost = as_int(d.get("standard_cost"), "Standard cost")
    if price < 0 or cost < 0:
        return err("Harga/cost tidak boleh negatif")
    vendor = d.get("default_vendor") or None
    get_db().execute("INSERT INTO products VALUES(?,?,?,?,?,?,?,?,1)",
                     (sku, d["name"], d.get("size"), d.get("color"), d["unit"], price, cost, vendor))
    for wh in ("WH-PKU", "OUT-MRP"):
        get_db().execute("INSERT INTO stock VALUES(?,?,0)", (sku, wh))
    audit(user(), "Create Product", sku, f"{d['name']} {d.get('size') or ''}")
    return ok({"sku": sku}, 201)


@bp.get("/contacts/<code>/credit")
@require("contacts.view")
def contact_credit(code):
    info = credit_info(code)
    if not info:
        return err("Customer tidak ditemukan", 404)
    return ok(info)


@bp.get("/settings/tax")
@require("tax.view")
def tax_settings():
    return ok({"tax_code": setting("tax_code", "VAT11"), "label": "PPN barang kemasan non-mewah",
               "nominal_rate": setting("tax_nominal_rate", "12") + "%", "tax_base_factor": setting("tax_base_factor"),
               "effective_rate": "11%", "rounding": setting("tax_rounding"), "scope": "Sale + vendor bill simulasi",
               "example": {"net": 90000, "tax": tax_of(90000), "gross": 90000 + tax_of(90000)}})


# ---------------------------------------------------------------- stock
@bp.get("/stock")
@require("inventory.view")
def stock():
    rows = get_db().execute("""SELECT s.sku,p.name,p.size,p.unit,s.warehouse_code,w.name warehouse,s.on_hand,
      COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.sku=s.sku AND r.warehouse_code=s.warehouse_code AND r.active=1),0) reserved,
      s.on_hand-COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.sku=s.sku AND r.warehouse_code=s.warehouse_code AND r.active=1),0) available,
      p.standard_cost,s.on_hand*p.standard_cost stock_value
      FROM stock s JOIN products p ON p.sku=s.sku JOIN warehouses w ON w.code=s.warehouse_code ORDER BY s.sku,s.warehouse_code""")
    return ok(rowdicts(rows))


@bp.get("/stock/reservations")
@require("inventory.view")
def reservations():
    return ok(rowdicts(get_db().execute("SELECT * FROM reservations WHERE active=1 ORDER BY id")))


# ---------------------------------------------------------------- document lists
LIST_QUERIES = {
    "sales": ("sales.view", "SELECT so.id, so.number, so.customer_code, c.name customer, so.status, so.warehouse_code, "
              "so.discount_pct, so.subtotal, so.tax, so.total, so.created_by, so.created_at, so.confirmed_at "
              "FROM sales_orders so JOIN customers c ON c.code=so.customer_code ORDER BY so.id DESC"),
    "purchase": ("purchase.view", "SELECT po.id, po.number, po.vendor_code, v.name vendor, po.status, po.subtotal, po.tax, "
                 "po.total, po.created_by, po.approved_by, po.created_at FROM purchase_orders po "
                 "JOIN vendors v ON v.code=po.vendor_code ORDER BY po.id DESC"),
    "deliveries": ("delivery.view", "SELECT d.id, d.number, so.number sales_order, c.name customer, d.warehouse_code, "
                   "d.status, d.created_at, d.validated_at FROM deliveries d JOIN sales_orders so ON so.id=d.order_id "
                   "JOIN customers c ON c.code=so.customer_code ORDER BY d.id DESC"),
    "receipts": ("receipt.view", "SELECT r.id, r.number, po.number purchase_order, po.vendor_code vendor, r.warehouse_code, "
                 "r.status, r.qc_number, (SELECT SUM(received_qty) FROM receipt_lines WHERE receipt_id=r.id) received, "
                 "(SELECT SUM(accepted_qty) FROM receipt_lines WHERE receipt_id=r.id) accepted, "
                 "(SELECT SUM(rejected_qty) FROM receipt_lines WHERE receipt_id=r.id) rejected, r.created_at "
                 "FROM receipts r JOIN purchase_orders po ON po.id=r.purchase_order_id ORDER BY r.id DESC"),
    "quality": ("quality.view", "SELECT r.id, COALESCE(r.qc_number,'(To Do)') qc_number, r.number receipt, po.number purchase_order, "
                "CASE WHEN r.status='Waiting' THEN 'To Do' WHEN r.status='Quality Checked' THEN 'Passed / Failed' ELSE 'Closed' END status, "
                "(SELECT SUM(received_qty) FROM receipt_lines WHERE receipt_id=r.id) inspected, "
                "(SELECT SUM(accepted_qty) FROM receipt_lines WHERE receipt_id=r.id) passed, "
                "(SELECT SUM(rejected_qty) FROM receipt_lines WHERE receipt_id=r.id) failed, r.qc_by inspector, r.qc_at "
                "FROM receipts r JOIN purchase_orders po ON po.id=r.purchase_order_id ORDER BY r.id DESC"),
    "invoices": ("invoicing.view", "SELECT i.id, i.number, so.number sales_order, c.name customer, i.status, i.payment_status, "
                 "i.net_amount, i.tax_amount, i.total, i.paid_amount, i.credited_amount, "
                 "i.total-i.paid_amount-i.credited_amount residual, i.created_at, i.posted_at FROM invoices i "
                 "JOIN sales_orders so ON so.id=i.order_id JOIN customers c ON c.code=so.customer_code ORDER BY i.id DESC"),
    "bills": ("bills.view", "SELECT b.id, b.number, po.number purchase_order, po.vendor_code vendor, r.number receipt, b.status, "
              "b.match_status, b.payment_status, b.net_amount, b.tax_amount, b.total, b.paid_amount, "
              "b.total-b.paid_amount residual, b.created_at FROM vendor_bills b JOIN purchase_orders po ON "
              "po.id=b.purchase_order_id JOIN receipts r ON r.id=b.receipt_id ORDER BY b.id DESC"),
    "payments": ("payments.view", "SELECT p.id, p.number, p.document_type, CASE WHEN p.document_type='customer' THEN "
                 "(SELECT number FROM invoices WHERE id=p.document_id) ELSE (SELECT number FROM vendor_bills WHERE id=p.document_id) END document, "
                 "p.amount, p.journal_number, p.created_by, p.payment_date FROM payments p ORDER BY p.id DESC"),
    "transfers": ("transfer.view", "SELECT id, number, sku, quantity, from_warehouse, to_warehouse, status, created_by, "
                  "created_at, validated_at FROM transfers ORDER BY id DESC"),
    "returns": ("returns.view", "SELECT r.id, r.number, i.number invoice, r.sku, r.quantity, r.inspection, r.status, "
                "r.credit_note_number, r.credit_net, r.credit_tax, r.credit_total, r.cogs_reversal, r.created_by, r.created_at "
                "FROM returns r JOIN invoices i ON i.id=r.invoice_id ORDER BY r.id DESC"),
    "leads": ("crm.view", "SELECT l.id, l.number, l.customer_code, c.name customer, l.title, l.stage, l.expected_sku, "
              "l.expected_qty, (SELECT number FROM sales_orders WHERE id=l.quotation_id) quotation, l.created_by, l.created_at "
              "FROM leads l LEFT JOIN customers c ON c.code=l.customer_code ORDER BY l.id DESC"),
    "journals": ("accounting.view", "SELECT j.id, j.number, j.entry_date, j.reference, j.source_type, j.memo, j.status, "
                 "(SELECT SUM(debit) FROM journal_lines WHERE journal_id=j.id) debit, "
                 "(SELECT SUM(credit) FROM journal_lines WHERE journal_id=j.id) credit, j.created_by "
                 "FROM journal_entries j ORDER BY j.id DESC"),
    "moves": ("inventory.view", "SELECT id, reference, move_type, sku, from_location, to_location, quantity, unit_cost, "
              "value, created_by, created_at FROM stock_moves ORDER BY id DESC"),
    "audit": ("audit.view", "SELECT * FROM audit_logs ORDER BY id DESC"),
}


@bp.get("/documents/<kind>")
def documents(kind):
    if not check_active():
        return err("Authentication required", 401)
    if kind not in LIST_QUERIES:
        return err("Unknown document type", 404)
    perm, sql = LIST_QUERIES[kind]
    if not allowed(perm):
        return deny(perm)
    rows = rowdicts(get_db().execute(sql))
    if staff_scoped(kind):
        rows = [r for r in rows if r.get("created_by") == user()]
    return ok(rows)


# Staff hanya melihat dokumen yang ia buat untuk modul miliknya; Manager melihat seluruh tim.
OWN_SCOPE = {"sales": "Sales", "leads": "Sales", "returns": "Sales", "purchase": "Procurement", "transfers": "Warehouse"}
DOC_SCOPE = {"sale": ("sales", "sales_orders"), "lead": ("leads", "leads"), "return": ("returns", "returns"),
             "purchase": ("purchase", "purchase_orders"), "transfer": ("transfers", "transfers")}


def staff_scoped(list_kind):
    return level() == "Staff" and OWN_SCOPE.get(list_kind) == role()


@bp.get("/history/<path:ref>")
@require("dashboard.view")
def history(ref):
    return ok(rowdicts(get_db().execute("SELECT * FROM audit_logs WHERE document_ref=? ORDER BY id", (ref,))))


# ---------------------------------------------------------------- CRM (SR-18, F-04)
LEAD_STAGES = ["New", "Qualified", "Proposition", "Won", "Lost"]


@bp.post("/leads")
@require("crm.create")
@tx
def create_lead():
    d = body()
    if not d.get("title"):
        return err("Judul prospek wajib diisi")
    if d.get("customer_code") and not one("SELECT 1 FROM customers WHERE code=?", (d["customer_code"],)):
        return err("Customer tidak ditemukan")
    no = next_number("CRM")
    cur = get_db().execute("INSERT INTO leads(number,customer_code,title,stage,notes,expected_sku,expected_qty,created_by) "
                           "VALUES(?,?,?,?,?,?,?,?)", (no, d.get("customer_code"), d["title"], "New", d.get("notes"),
                                                     d.get("expected_sku"), as_int(d.get("expected_qty", 0), "Qty"), user()))
    get_db().execute("INSERT INTO lead_stage_history(lead_id,from_stage,to_stage,actor) VALUES(?,?,?,?)",
                     (cur.lastrowid, None, "New", user()))
    audit(user(), "Create Lead", no, d["title"])
    return ok({"id": cur.lastrowid, "number": no}, 201)


@bp.post("/leads/<int:lid>/stage")
@require("crm.edit")
@tx
def lead_stage(lid):
    stage = body().get("stage")
    lead = one("SELECT * FROM leads WHERE id=?", (lid,))
    if not lead:
        return err("Lead tidak ditemukan", 404)
    if stage not in LEAD_STAGES:
        return err("Stage tidak valid")
    if stage == lead["stage"]:
        return ok({"stage": stage, "unchanged": True})
    get_db().execute("UPDATE leads SET stage=? WHERE id=?", (stage, lid))
    get_db().execute("INSERT INTO lead_stage_history(lead_id,from_stage,to_stage,actor) VALUES(?,?,?,?)",
                     (lid, lead["stage"], stage, user()))
    audit(user(), "Stage change", lead["number"], f"{lead['stage']} → {stage}; tidak ada revenue/jurnal")
    return ok({"stage": stage})


@bp.post("/leads/<int:lid>/quotation")
@require("sales.create")
@tx
def lead_to_quotation(lid):
    """Konversi Opportunity -> Quotation. Tidak membuat jurnal/revenue (SR-18, T-08)."""
    lead = one("SELECT * FROM leads WHERE id=?", (lid,))
    if not lead:
        return err("Lead tidak ditemukan", 404)
    if lead["quotation_id"]:
        q = one("SELECT number FROM sales_orders WHERE id=?", (lead["quotation_id"],))
        return ok({"id": lead["quotation_id"], "number": q["number"], "idempotent": True})
    if not lead["customer_code"] or not lead["expected_sku"]:
        return err("Lead belum memiliki customer dan expected SKU")
    d = body()
    lines = d.get("lines") or [{"sku": lead["expected_sku"], "quantity": lead["expected_qty"] or 1}]
    so = build_quotation(lead["customer_code"], lines, d.get("discount_pct", 0), d.get("warehouse_code", "WH-PKU"), lid)
    if isinstance(so, tuple):
        return so
    get_db().execute("UPDATE leads SET quotation_id=?, stage=CASE WHEN stage IN ('New','Qualified') THEN 'Proposition' "
                     "ELSE stage END WHERE id=?", (so["id"], lid))
    if lead["stage"] in ("New", "Qualified"):
        get_db().execute("INSERT INTO lead_stage_history(lead_id,from_stage,to_stage,actor) VALUES(?,?,?,?)",
                         (lid, lead["stage"], "Proposition", user()))
    audit(user(), "Convert to Quotation", lead["number"], f"→ {so['number']}")
    return ok(so, 201)


# ---------------------------------------------------------------- Sales (SR-01, SR-07, SR-08, SR-09, F-05, F-06, F-10)
def price_lines(lines, discount):
    db = get_db()
    max_disc = float(setting("max_discount_pct", "20"))
    if discount < 0 or discount > max_disc:
        raise ValueError(f"Diskon harus 0–{max_disc:g}%")
    prepared = []
    for line in lines:
        p = db.execute("SELECT * FROM products WHERE sku=? AND active=1", (line.get("sku"),)).fetchone()
        qty = as_int(line.get("quantity", 0), "Quantity")
        if not p or qty <= 0:
            raise ValueError("SKU/quantity tidak valid")
        price = as_int(line.get("unit_price", p["sales_price"]), "Unit price")
        if price <= 0:
            raise ValueError("Unit price harus > 0")
        gross = qty * price
        net = half_up(Fraction(gross) * (1 - Fraction(str(discount)) / 100))
        tax = tax_of(net)
        prepared.append({"sku": p["sku"], "qty": qty, "price": price, "list_price": p["sales_price"],
                         "disc": discount, "net": net, "tax": tax, "gross": net + tax})
    return prepared


def effective_discount(order_id=None, prepared=None):
    """Diskon efektif terhadap harga list (diskon % + potongan harga unit)."""
    if prepared is None:
        rows = get_db().execute("SELECT l.*, p.sales_price list_price FROM sales_order_lines l JOIN products p "
                                "ON p.sku=l.sku WHERE order_id=?", (order_id,)).fetchall()
        prepared = [{"qty": r["quantity"], "list_price": r["list_price"], "net": r["subtotal"]} for r in rows]
    listv = sum(x["qty"] * x["list_price"] for x in prepared)
    netv = sum(x["net"] for x in prepared)
    return round((1 - netv / listv) * 100, 2) if listv else 0


def build_quotation(customer, lines, discount, warehouse, lead_id=None, revision_of=None):
    db = get_db()
    if not lines:
        return err("Tambahkan minimal satu product line")
    if not one("SELECT 1 FROM customers WHERE code=? AND active=1", (customer,)):
        return err("Customer tidak ditemukan")
    if not one("SELECT 1 FROM warehouses WHERE code=?", (warehouse,)):
        return err("Gudang tidak ditemukan")
    discount = float(discount or 0)
    prepared = price_lines(lines, discount)
    subtotal = sum(x["net"] for x in prepared)
    tax = sum(x["tax"] for x in prepared)
    no = next_number("SO")
    eff = effective_discount(prepared=prepared)
    status = "Pending Approval" if eff > float(setting("discount_approval_pct", "10")) else "Quotation"
    cur = db.execute("INSERT INTO sales_orders(number,customer_code,status,discount_pct,subtotal,tax,total,warehouse_code,"
                     "created_by,lead_id,revision_of) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                     (no, customer, status, discount, subtotal, tax, subtotal + tax, warehouse, user(), lead_id, revision_of))
    oid = cur.lastrowid
    for x in prepared:
        db.execute("INSERT INTO sales_order_lines(order_id,sku,quantity,unit_price,discount_pct,subtotal,tax,total) "
                   "VALUES(?,?,?,?,?,?,?,?)", (oid, x["sku"], x["qty"], x["price"], x["disc"], x["net"], x["tax"], x["gross"]))
    items = ", ".join("%s×%s" % (x["sku"], x["qty"]) for x in prepared)
    audit(user(), "Create Quotation", no, f"{customer} · {items} · net {idr(subtotal)} · PPN {idr(tax)} · total {idr(subtotal + tax)}")
    if status == "Pending Approval":
        audit(user(), "Approval requested", no, f"Diskon efektif {eff}% > {setting('discount_approval_pct', '10')}% — menunggu approval Owner")
    return {"id": oid, "number": no, "subtotal": subtotal, "tax": tax, "total": subtotal + tax,
            "effective_discount": eff, "status": status}


@bp.post("/sales-orders")
@require("sales.create")
@tx
def create_so():
    d = body()
    so = build_quotation(d.get("customer_code"), d.get("lines", []), d.get("discount_pct", 0),
                         d.get("warehouse_code", "WH-PKU"))
    return so if isinstance(so, tuple) else ok(so, 201)


@bp.put("/sales-orders/<int:oid>")
@require("sales.edit")
@tx
def update_so(oid):
    """SR-08: setelah Confirmed harga & diskon terkunci. Perubahan hanya lewat revisi."""
    db = get_db()
    so = one("SELECT * FROM sales_orders WHERE id=?", (oid,))
    if not so:
        return err("SO tidak ditemukan", 404)
    if so["status"] not in ("Quotation", "Pending Approval"):
        return blocked("Blocked edit (locked)", so["number"], f"Percobaan ubah harga/diskon pada status {so['status']}",
                       f"{so['number']} berstatus {so['status']} sehingga harga dan diskon terkunci (SR-08). "
                       "Gunakan tombol Revisi untuk perubahan terkontrol.", locked=True)
    d = body()
    discount = float(d.get("discount_pct", so["discount_pct"]))
    lines = d.get("lines") or [{"sku": l["sku"], "quantity": l["quantity"], "unit_price": l["unit_price"]}
                               for l in db.execute("SELECT * FROM sales_order_lines WHERE order_id=?", (oid,))]
    prepared = price_lines(lines, discount)
    db.execute("DELETE FROM sales_order_lines WHERE order_id=?", (oid,))
    for x in prepared:
        db.execute("INSERT INTO sales_order_lines(order_id,sku,quantity,unit_price,discount_pct,subtotal,tax,total) "
                   "VALUES(?,?,?,?,?,?,?,?)", (oid, x["sku"], x["qty"], x["price"], x["disc"], x["net"], x["tax"], x["gross"]))
    sub = sum(x["net"] for x in prepared)
    tax = sum(x["tax"] for x in prepared)
    eff = effective_discount(prepared=prepared)
    status = "Pending Approval" if eff > float(setting("discount_approval_pct", "10")) else "Quotation"
    db.execute("UPDATE sales_orders SET discount_pct=?, subtotal=?, tax=?, total=?, status=?, "
               "discount_approved_by=NULL, discount_approved_at=NULL WHERE id=?", (discount, sub, tax, sub + tax, status, oid))
    audit(user(), "Edit Quotation", so["number"], f"Diskon {discount:g}% · total {idr(sub + tax)} (approval di-reset)")
    if status == "Pending Approval":
        audit(user(), "Approval requested", so["number"], f"Diskon efektif {eff}% — menunggu approval Owner")
    return ok({"id": oid, "subtotal": sub, "tax": tax, "total": sub + tax, "status": status, "effective_discount": eff})


@bp.post("/sales-orders/<int:oid>/approve-discount")
@require("sales.approve")
@tx
def approve_discount(oid):
    so = one("SELECT * FROM sales_orders WHERE id=?", (oid,))
    if not so or so["status"] not in ("Quotation", "Pending Approval"):
        return err("Dokumen tidak menunggu approval", 409)
    get_db().execute("UPDATE sales_orders SET status='Quotation', discount_approved_by=?, discount_approved_at=CURRENT_TIMESTAMP "
                     "WHERE id=?", (user(), oid))
    audit(user(), "Approve discount", so["number"], f"Diskon efektif {effective_discount(oid)}% disetujui Owner")
    return ok({"status": "Quotation", "approved_by": user()})


@bp.post("/sales-orders/<int:oid>/confirm")
@require("sales.confirm")
@tx
def confirm_so(oid):
    db = get_db()
    so = one("SELECT * FROM sales_orders WHERE id=?", (oid,))
    if not so:
        return err("SO tidak ditemukan", 404)
    if so["status"] == "Confirmed":
        return ok({"status": "Confirmed", "number": so["number"], "idempotent": True})
    if so["status"] not in ("Quotation", "Pending Approval"):
        return err(f"SO berstatus {so['status']}", 409)
    eff = effective_discount(oid)
    limit = float(setting("discount_approval_pct", "10"))
    approved_by = so["discount_approved_by"]
    if eff > limit and not approved_by:
        if allowed("sales.approve"):
            approved_by = user()
        else:
            db.execute("UPDATE sales_orders SET status='Pending Approval' WHERE id=?", (oid,))
            db.commit()  # status Pending Approval harus tersimpan meski respons 409
            begin(db)
            return blocked("Approval required", so["number"], f"Diskon efektif {eff}% > {limit:g}% — konfirmasi ditahan",
                           f"Diskon {eff}% melebihi {limit:g}%: konfirmasi ditahan dan butuh approval Owner (SR-08).",
                           status_after="Pending Approval")
    # SR-09 credit exposure
    ci = credit_info(so["customer_code"], so["total"])
    if ci["exposure_after"] > ci["credit_limit"]:
        return blocked("Credit hold", so["number"],
                       f"Exposure {idr(ci['exposure_after'])} > limit {idr(ci['credit_limit'])}",
                       f"Credit limit terlampaui: AR terbuka {idr(ci['ar_open'])} + SO Confirmed belum ditagih "
                       f"{idr(ci['confirmed_uninvoiced'])} + SO ini {idr(so['total'])} = {idr(ci['exposure_after'])} "
                       f"> limit {idr(ci['credit_limit'])}. SO tetap belum Confirmed (SR-09).", credit=ci)
    # SR-03/SR-04 Available = On Hand − Reserved, tidak boleh negatif
    need = {}
    for l in db.execute("SELECT * FROM sales_order_lines WHERE order_id=?", (oid,)):
        need[l["sku"]] = need.get(l["sku"], 0) + l["quantity"]
    for sku, qty in need.items():
        av = available(sku, so["warehouse_code"])
        if qty > av:
            return blocked("Blocked oversell", so["number"], f"{sku}: diminta {qty}, available {av} di {so['warehouse_code']}",
                           f"Available {sku} di {so['warehouse_code']} hanya {av} (On Hand {on_hand(sku, so['warehouse_code'])}"
                           f" − Reserved {reserved_qty(sku, so['warehouse_code'])}). Pesanan {qty} ditolak; "
                           "reservasi pesanan lain tidak boleh dipakai (SR-03/SR-04).")
    for sku, qty in need.items():
        db.execute("INSERT INTO reservations(document_no,sku,warehouse_code,quantity,active) VALUES(?,?,?,?,1)",
                   (so["number"], sku, so["warehouse_code"], qty))
    db.execute("UPDATE sales_orders SET status='Confirmed', confirmed_at=CURRENT_TIMESTAMP, discount_approved_by=? "
               "WHERE id=?", (approved_by, oid))
    audit(user(), "Confirmed + reserve", so["number"],
          f"Reserve {', '.join(f'{k}×{v}' for k, v in need.items())} @ {so['warehouse_code']}; "
          f"exposure {idr(ci['exposure_after'])}/{idr(ci['credit_limit'])}")
    return ok({"status": "Confirmed", "number": so["number"], "exposure": ci["exposure_after"],
               "headroom": ci["headroom_after"]})


@bp.post("/sales-orders/<int:oid>/revise")
@require("sales.edit")
@tx
def revise_so(oid):
    """Revisi terkontrol: SO lama di-Cancel (reservasi dilepas) dan Quotation revisi baru dibuat."""
    db = get_db()
    so = one("SELECT * FROM sales_orders WHERE id=?", (oid,))
    if not so or so["status"] != "Confirmed":
        return err("Hanya SO Confirmed yang dapat direvisi", 409)
    if scalar("SELECT COUNT(*) FROM deliveries WHERE order_id=? AND status='Done'", (oid,)) or \
            scalar("SELECT COUNT(*) FROM invoices WHERE order_id=?", (oid,)):
        return blocked("Blocked revision", so["number"], "Sudah ada delivery/invoice",
                       "SO sudah memiliki Delivery Done atau Invoice; revisi tidak diizinkan.")
    db.execute("UPDATE deliveries SET status='Cancelled' WHERE order_id=? AND status='Ready'", (oid,))
    db.execute("UPDATE reservations SET active=0 WHERE document_no=?", (so["number"],))
    db.execute("UPDATE sales_orders SET status='Cancelled', cancelled_at=CURRENT_TIMESTAMP WHERE id=?", (oid,))
    lines = [{"sku": l["sku"], "quantity": l["quantity"], "unit_price": l["unit_price"]}
             for l in db.execute("SELECT * FROM sales_order_lines WHERE order_id=?", (oid,))]
    new = build_quotation(so["customer_code"], lines, so["discount_pct"], so["warehouse_code"], so["lead_id"], oid)
    if isinstance(new, tuple):
        return new
    audit(user(), "Revision", so["number"], f"Dibatalkan & direvisi menjadi {new['number']}; reservasi dilepas")
    return ok({"cancelled": so["number"], **new}, 201)


@bp.post("/sales-orders/<int:oid>/cancel")
@require("sales.cancel")
@tx
def cancel_so(oid):
    db = get_db()
    so = one("SELECT * FROM sales_orders WHERE id=?", (oid,))
    if not so:
        return err("SO tidak ditemukan", 404)
    if so["status"] == "Cancelled":
        return ok({"status": "Cancelled", "idempotent": True})
    if scalar("SELECT COUNT(*) FROM deliveries WHERE order_id=? AND status='Done'", (oid,)):
        return err("SO sudah memiliki delivery Done; tidak dapat dibatalkan", 409)
    db.execute("UPDATE deliveries SET status='Cancelled' WHERE order_id=? AND status='Ready'", (oid,))
    db.execute("UPDATE reservations SET active=0 WHERE document_no=?", (so["number"],))
    db.execute("UPDATE sales_orders SET status='Cancelled', cancelled_at=CURRENT_TIMESTAMP WHERE id=?", (oid,))
    audit(user(), "Cancel", so["number"], "Reservasi dilepas")
    return ok({"status": "Cancelled"})


# ---------------------------------------------------------------- Delivery (SR-02, SR-04, F-08, F-15)
def so_lines_status(so):
    out = []
    for l in get_db().execute("SELECT sol.*, p.name, p.size, p.unit, p.standard_cost FROM sales_order_lines sol "
                              "JOIN products p ON p.sku=sol.sku WHERE sol.order_id=?", (so["id"],)):
        delivered = delivered_qty(so["id"], l["sku"])
        ready = delivered_qty(so["id"], l["sku"], "Ready")
        inv = invoiced_qty(so["id"], l["sku"], ("Posted",))
        inv_draft = invoiced_qty(so["id"], l["sku"], ("Draft",))
        out.append({"sku": l["sku"], "product_name": f"{l['name']} {l['size'] or ''}".strip(), "unit": l["unit"],
                    "ordered_qty": l["quantity"], "delivered_qty": delivered, "pending_ready_qty": ready,
                    "remaining_qty": l["quantity"] - delivered, "backorder_qty": l["quantity"] - delivered,
                    "invoiced_qty": inv, "draft_invoiced_qty": inv_draft,
                    "invoiceable_qty": max(0, delivered - inv - inv_draft),
                    "returned_qty": returned_qty(so["id"], l["sku"], RET_STOCKED),
                    "unit_price": l["unit_price"], "discount_pct": l["discount_pct"], "subtotal": l["subtotal"],
                    "tax": l["tax"], "total": l["total"], "standard_cost": l["standard_cost"],
                    "on_hand": on_hand(l["sku"], so["warehouse_code"]),
                    "reserved": reserved_qty(l["sku"], so["warehouse_code"]),
                    "available": available(l["sku"], so["warehouse_code"])})
    return out


@bp.get("/sales-orders/for-delivery")
@require("delivery.view")
def sales_orders_for_delivery():
    db = get_db()
    result = []
    for so in db.execute("SELECT so.*, c.name customer_name FROM sales_orders so JOIN customers c ON c.code=so.customer_code "
                         "WHERE so.status='Confirmed' ORDER BY so.id DESC").fetchall():
        lines = so_lines_status(so)
        if any(l["remaining_qty"] - l["pending_ready_qty"] > 0 for l in lines):
            d = dict(so)
            d["lines"] = lines
            result.append(d)
    return ok(result)


@bp.get("/sales-orders/for-invoice")
@require("invoicing.view")
def sales_orders_for_invoice():
    db = get_db()
    result = []
    for so in db.execute("SELECT so.*, c.name customer_name FROM sales_orders so JOIN customers c ON c.code=so.customer_code "
                         "WHERE so.status='Confirmed' ORDER BY so.id DESC").fetchall():
        d = dict(so)
        d["lines"] = so_lines_status(so)
        d["invoiceable_qty"] = sum(l["invoiceable_qty"] for l in d["lines"])
        result.append(d)
    return ok(result)


@bp.post("/sales-orders/<int:oid>/delivery")
@require("delivery.create")
@tx
def create_delivery(oid):
    db = get_db()
    so = one("SELECT * FROM sales_orders WHERE id=?", (oid,))
    if not so:
        return err("Sales Order tidak ditemukan", 404)
    if so["status"] != "Confirmed":
        return err("Sales Order harus berstatus Confirmed untuk membuat pengiriman", 409)
    qtymap = body().get("quantities", {}) or {}
    prepared = []
    for l in so_lines_status(so):
        qty = as_int(qtymap.get(l["sku"], 0), f"Qty {l['sku']}")
        if qty < 0:
            return err(f"Kuantitas untuk {l['sku']} tidak boleh negatif")
        free = l["remaining_qty"] - l["pending_ready_qty"]
        if qty > free:
            return err(f"Kuantitas {qty} melebihi sisa yang dapat dikirim ({free}) untuk {l['sku']}", 409)
        if qty:
            prepared.append((l["sku"], qty))
    if not prepared:
        return err("Kuantitas pengiriman minimal 1 unit")
    no = next_number("DO")
    cur = db.execute("INSERT INTO deliveries(number,order_id,status,warehouse_code) VALUES(?,?,'Ready',?)",
                     (no, oid, so["warehouse_code"]))
    for sku, qty in prepared:
        db.execute("INSERT INTO delivery_lines(delivery_id,sku,quantity) VALUES(?,?,?)", (cur.lastrowid, sku, qty))
    audit(user(), "Create Delivery", no, f"{so['number']} · {sum(q for _, q in prepared)} unit")
    audit(user(), "Create Delivery", so["number"], no)
    return ok({"id": cur.lastrowid, "number": no, "status": "Ready"}, 201)


@bp.get("/deliveries/<int:did>")
@require("delivery.view")
def get_delivery_detail(did):
    return ok(doc_delivery(did))


@bp.post("/deliveries/<int:did>/validate")
@require("delivery.validate")
@tx
def validate_delivery(did):
    db = get_db()
    d = one("SELECT * FROM deliveries WHERE id=?", (did,))
    if not d:
        return err("Delivery tidak ditemukan", 404)
    if d["status"] == "Done":  # SR-15 / T-26 idempotent
        return ok({"status": "Done", "idempotent": True, "number": d["number"],
                   "message": "Delivery sudah divalidasi; tidak ada stock move/jurnal tambahan"})
    if d["status"] != "Ready":
        return err(f"Delivery berstatus {d['status']}", 409)
    if db.execute("UPDATE deliveries SET status='Done', validated_at=CURRENT_TIMESTAMP, validated_by=? WHERE id=? AND "
                  "status='Ready'", (user(), did)).rowcount != 1:
        return ok({"status": "Done", "idempotent": True})
    so = one("SELECT * FROM sales_orders WHERE id=?", (d["order_id"],))
    lines = db.execute("SELECT * FROM delivery_lines WHERE delivery_id=?", (did,)).fetchall()
    total_cogs = 0
    for l in lines:
        oh = on_hand(l["sku"], d["warehouse_code"])
        own = scalar("SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE document_no=? AND sku=? AND "
                     "warehouse_code=? AND active=1", (so["number"], l["sku"], d["warehouse_code"]))
        other = reserved_qty(l["sku"], d["warehouse_code"], so["number"])
        if l["quantity"] > oh:
            return err(f"On Hand {l['sku']} ({oh}) tidak cukup; stok tidak boleh negatif (SR-04)", 409)
        if oh - other < l["quantity"]:
            return err(f"Pengiriman {l['sku']} akan memakai Reserved milik pesanan lain (SR-04)", 409)
        if l["quantity"] > own:
            return err(f"Kuantitas {l['quantity']} melebihi reservasi pesanan ({own}) untuk {l['sku']}", 409)
        db.execute("UPDATE stock SET on_hand=on_hand-? WHERE sku=? AND warehouse_code=?",
                   (l["quantity"], l["sku"], d["warehouse_code"]))
        db.execute("UPDATE reservations SET quantity=quantity-? WHERE document_no=? AND sku=? AND warehouse_code=? AND active=1",
                   (l["quantity"], so["number"], l["sku"], d["warehouse_code"]))
        need = l["quantity"]  # FEFO: kurangi lot dengan expiry terdekat lebih dulu
        for lot in db.execute("SELECT id, remaining_qty FROM lots WHERE sku=? AND warehouse_code=? AND remaining_qty>0 "
                              "AND status='Released' ORDER BY COALESCE(expiry_date,'9999-12-31'), id",
                              (l["sku"], d["warehouse_code"])).fetchall():
            if need <= 0:
                break
            take = min(need, lot["remaining_qty"])
            db.execute("UPDATE lots SET remaining_qty=remaining_qty-? WHERE id=?", (take, lot["id"]))
            need -= take
        cost = stock_move(d["number"], "Delivery", l["sku"], d["warehouse_code"], "Customer", l["quantity"], user())
        total_cogs += cost * l["quantity"]
    db.execute("UPDATE reservations SET active=0 WHERE quantity<=0")
    jno = post_journal("Delivery", did, d["number"], [("5100", total_cogs, 0, f"COGS {d['number']}"),
                                                     ("1200", 0, total_cogs, f"Inventory out {d['number']}")],
                       user(), f"Delivery {so['number']} @ standard cost")
    audit(user(), "Validate Delivery", d["number"], f"Stock −{sum(l['quantity'] for l in lines)}; COGS {idr(total_cogs)}; {jno}")
    audit(user(), "Delivery validated", so["number"], f"{d['number']} · {jno}")
    return ok({"status": "Done", "number": d["number"], "total_cogs": total_cogs, "journal_number": jno})


# ---------------------------------------------------------------- Customer Invoice (SR-01, SR-02, SR-14, F-09)
@bp.post("/invoices/from-order/<int:oid>")
@require("invoicing.create")
@tx
def invoice_from_order(oid):
    db = get_db()
    so = one("SELECT * FROM sales_orders WHERE id=?", (oid,))
    if not so or so["status"] != "Confirmed":
        return err("SO belum Confirmed", 409)
    requested = body().get("quantities") or {}
    lines = []
    for l in so_lines_status(so):
        qty = l["invoiceable_qty"]
        if l["sku"] in requested:
            want = as_int(requested[l["sku"]], "Qty")
            if want > qty:
                return blocked("Blocked over-invoice", so["number"],
                               f"{l['sku']} diminta {want}, delivered belum ditagih {qty}",
                               f"Invoice {l['sku']} maksimal {qty} unit (delivered {l['delivered_qty']} − sudah ditagih "
                               f"{l['invoiced_qty'] + l['draft_invoiced_qty']}). Backorder {l['backorder_qty']} unit belum "
                               "boleh ditagih (SR-02).", invoiceable=qty)
            qty = want
        if qty > 0:
            gross = qty * l["unit_price"]
            net = half_up(Fraction(gross) * (1 - Fraction(str(l["discount_pct"])) / 100))
            lines.append((l["sku"], qty, l["unit_price"], net, tax_of(net), gross - net))
    if not lines:
        return blocked("Blocked invoice", so["number"], "Invoicable quantity 0",
                       "Invoicable quantity 0: belum ada Delivery Done yang belum ditagih (SR-01/SR-02).", invoiceable=0)
    net = sum(x[3] for x in lines)
    tax = sum(x[4] for x in lines)
    no = next_number("INV")
    cur = db.execute("INSERT INTO invoices(number,order_id,status,net_amount,tax_amount,total) VALUES(?,?,'Draft',?,?,?)",
                     (no, oid, net, tax, net + tax))
    for x in lines:
        db.execute("INSERT INTO invoice_lines(invoice_id,sku,quantity,unit_price,net_amount,tax_amount,discount_amount) "
                   "VALUES(?,?,?,?,?,?,?)", (cur.lastrowid, *x))
    audit(user(), "Create Customer Invoice", no, f"{so['number']} · net {idr(net)} · PPN {idr(tax)}")
    audit(user(), "Invoice drafted", so["number"], no)
    return ok({"id": cur.lastrowid, "number": no, "net": net, "tax": tax, "total": net + tax}, 201)


@bp.post("/invoices/<int:iid>/post")
@require("invoicing.post")
@tx
def post_invoice(iid):
    db = get_db()
    inv = one("SELECT * FROM invoices WHERE id=?", (iid,))
    if not inv:
        return err("Invoice tidak ditemukan", 404)
    if inv["status"] == "Posted":  # SR-15 / T-36
        return ok({"status": "Posted", "idempotent": True, "number": inv["number"],
                   "message": "Invoice sudah Posted; tidak ada jurnal/AR tambahan"})
    if inv["status"] != "Draft":
        return err("Status invoice tidak valid", 409)
    if db.execute("UPDATE invoices SET status='Posted', posted_at=CURRENT_TIMESTAMP, posted_by=? WHERE id=? AND status='Draft'",
                  (user(), iid)).rowcount != 1:
        return ok({"status": "Posted", "idempotent": True})
    so = one("SELECT * FROM sales_orders WHERE id=?", (inv["order_id"],))
    for l in db.execute("SELECT * FROM invoice_lines WHERE invoice_id=?", (iid,)):  # recheck cap SR-02
        if invoiced_qty(so["id"], l["sku"], ("Posted",)) > delivered_qty(so["id"], l["sku"]):
            return err(f"Invoice melebihi delivered quantity untuk {l['sku']}", 409)
    disc = scalar("SELECT COALESCE(SUM(discount_amount),0) FROM invoice_lines WHERE invoice_id=?", (iid,))
    jno = post_journal("Customer Invoice", iid, inv["number"], [
        ("1100", inv["total"], 0, f"AR {so['customer_code']}"),
        ("4110", disc, 0, "Sales discount"),
        ("4100", 0, inv["net_amount"] + disc, "Sales revenue"),
        ("2200", 0, inv["tax_amount"], "VAT output 11%")], user(), f"Invoice {so['number']}")
    audit(user(), "Post Customer Invoice", inv["number"], f"AR +{idr(inv['total'])}; Revenue {idr(inv['net_amount'])}; "
                                                         f"PPN {idr(inv['tax_amount'])}; {jno}")
    audit(user(), "Invoice posted", so["number"], inv["number"])
    return ok({"status": "Posted", "number": inv["number"], "journal_number": jno})


# ---------------------------------------------------------------- Purchase (SR-05, SR-20, F-11, F-22)
@bp.post("/purchase-orders")
@require("purchase.create")
@tx
def create_po():
    d = body()
    db = get_db()
    lines = d.get("lines", [])
    if not lines:
        return err("Tambahkan product line")
    if not one("SELECT 1 FROM vendors WHERE code=?", (d.get("vendor_code"),)):
        return err("Vendor tidak ditemukan")
    prepared = []
    for x in lines:
        p = one("SELECT * FROM products WHERE sku=?", (x.get("sku"),))
        if not p:
            return err("SKU tidak valid")
        pl = one("SELECT purchase_price FROM vendor_pricelist WHERE vendor_code=? AND sku=?", (d["vendor_code"], p["sku"]))
        qty = as_int(x.get("quantity", 0), "Quantity")
        cost = as_int(x.get("unit_cost") if x.get("unit_cost") not in (None, "") else
                      (pl["purchase_price"] if pl else p["standard_cost"]), "Unit cost")
        if qty <= 0 or cost < 0:
            return err("Quantity/cost tidak valid")
        n = qty * cost
        prepared.append((p["sku"], qty, cost, n, tax_of(n)))
    sub = sum(x[3] for x in prepared)
    tax = sum(x[4] for x in prepared)
    no = next_number("PO")
    expected = d.get("expected_date") or (now_wib() + timedelta(days=7)).strftime("%Y-%m-%d")
    cur = db.execute("INSERT INTO purchase_orders(number,vendor_code,status,subtotal,tax,total,created_by,expected_date) "
                     "VALUES(?,?,'RFQ',?,?,?,?,?)", (no, d["vendor_code"], sub, tax, sub + tax, user(), expected))
    for x in prepared:
        db.execute("INSERT INTO purchase_order_lines(order_id,sku,quantity,unit_cost,subtotal,tax) VALUES(?,?,?,?,?,?)",
                   (cur.lastrowid, *x))
    audit(user(), "Create RFQ", no, f"{d['vendor_code']} · subtotal {idr(sub)} · gross {idr(sub + tax)}; stock tidak berubah")
    return ok({"id": cur.lastrowid, "number": no, "subtotal": sub, "tax": tax, "total": sub + tax}, 201)


@bp.post("/purchase-orders/<int:oid>/confirm")
@require("purchase.confirm")
@tx
def confirm_po(oid):
    db = get_db()
    po = one("SELECT * FROM purchase_orders WHERE id=?", (oid,))
    if not po:
        return err("PO tidak ditemukan", 404)
    if po["status"] == "Confirmed":
        return ok({"status": "Confirmed", "idempotent": True})
    if po["status"] not in ("RFQ", "Pending Approval"):
        return err("PO bukan RFQ", 409)
    threshold = int(setting("large_po_threshold", "1000000"))
    if po["subtotal"] > threshold and not allowed("purchase.approve"):
        if po["status"] == "Pending Approval":
            return blocked("Confirm attempt blocked", po["number"], "Masih menunggu approval Owner",
                           "PO masih Pending Approval; hanya Owner yang dapat menyetujui (SR-20).", status_after="Pending Approval")
        db.execute("UPDATE purchase_orders SET status='Pending Approval' WHERE id=?", (oid,))
        audit(user(), "Request PO Approval", po["number"],
              f"Subtotal {idr(po['subtotal'])} > {idr(threshold)}; percobaan Confirm oleh {role()} ditahan")
        return ok({"status": "Pending Approval", "message": f"Subtotal {idr(po['subtotal'])} di atas {idr(threshold)}: "
                                                           "menunggu approval Owner (SR-20)."}, 202)
    approved = user() if po["subtotal"] > threshold else None
    db.execute("UPDATE purchase_orders SET status='Confirmed', confirmed_at=CURRENT_TIMESTAMP, approved_by=COALESCE(?,approved_by), "
               "approved_at=CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE approved_at END WHERE id=?",
               (approved, approved, oid))
    audit(user(), "Confirm Purchase Order", po["number"], "Approved by Owner" if approved else "Di bawah ambang approval")
    return ok({"status": "Confirmed"})


@bp.post("/purchase-orders/<int:oid>/approve")
@require("purchase.approve")
@tx
def approve_po(oid):
    db = get_db()
    po = one("SELECT * FROM purchase_orders WHERE id=?", (oid,))
    if not po or po["status"] != "Pending Approval":
        return err("PO tidak menunggu approval", 409)
    db.execute("UPDATE purchase_orders SET status='Confirmed', approved_by=?, approved_at=CURRENT_TIMESTAMP, "
               "confirmed_at=CURRENT_TIMESTAMP WHERE id=?", (user(), oid))
    audit(user(), "Approve Purchase Order", po["number"], f"Approved & Confirmed oleh {user()}")
    return ok({"status": "Confirmed", "approved_by": user()})


@bp.post("/purchase-orders/<int:oid>/cancel")
@require("purchase.cancel")
@tx
def cancel_po(oid):
    po = one("SELECT * FROM purchase_orders WHERE id=?", (oid,))
    if not po:
        return err("PO tidak ditemukan", 404)
    if po["status"] not in ("RFQ", "Pending Approval"):
        return err("Hanya RFQ/Pending Approval yang dapat dibatalkan", 409)
    get_db().execute("UPDATE purchase_orders SET status='Cancelled' WHERE id=?", (oid,))
    audit(user(), "Cancel", po["number"])
    return ok({"status": "Cancelled"})


# ---------------------------------------------------------------- Receipt + Quality (SR-06, SR-11, F-12, F-13)
def received_so_far(poid, sku, exclude_rid=None):
    sql = ("SELECT COALESCE(SUM(rl.received_qty),0) FROM receipt_lines rl JOIN receipts r ON r.id=rl.receipt_id "
           "WHERE r.purchase_order_id=? AND rl.sku=? AND r.status<>'Cancelled'")
    args = [poid, sku]
    if exclude_rid:
        sql += " AND r.id<>?"
        args.append(exclude_rid)
    return scalar(sql, args)


@bp.post("/purchase-orders/<int:oid>/receipt")
@require("receipt.create")
@tx
def create_receipt(oid):
    db = get_db()
    po = one("SELECT * FROM purchase_orders WHERE id=?", (oid,))
    if not po or po["status"] != "Confirmed":
        return err("PO harus Confirmed", 409)
    d = body()
    wh = d.get("warehouse_code", "WH-PKU")
    pol = {l["sku"]: l for l in db.execute("SELECT * FROM purchase_order_lines WHERE order_id=?", (oid,))}
    lines = d.get("lines") or [{"sku": s, "received_qty": l["quantity"] - received_so_far(oid, s)} for s, l in pol.items()]
    prepared = []
    for x in lines:
        sku = x.get("sku")
        if sku not in pol:
            return err(f"SKU {sku} tidak ada di PO")
        qty = as_int(x.get("received_qty", 0), "Received qty")
        if qty <= 0:
            continue
        if x.get("accepted_qty") not in (None, "") or x.get("rejected_qty") not in (None, ""):
            pass  # accepted/rejected hanya boleh diisi Quality Check (SR-11), diabaikan di sini
        already = received_so_far(oid, sku)
        if already + qty > pol[sku]["quantity"]:
            return blocked("Blocked over-receipt", po["number"],
                           f"{sku}: diterima {already}+{qty} > PO {pol[sku]['quantity']}",
                           f"Receipt {qty} unit {sku} melebihi sisa PO ({pol[sku]['quantity'] - already} dari "
                           f"{pol[sku]['quantity']}). Kelebihan tidak diproses — ajukan revisi PO (SR-06).")
        lot = (x.get("lot_number") or "").strip() or None
        exp = (x.get("expiry_date") or "").strip() or None
        if exp:
            import datetime as _dt
            try:
                _dt.date.fromisoformat(exp)
            except ValueError:
                return err(f"{sku}: format expiry harus YYYY-MM-DD")
        if (lot or exp) and not allowed("lots.manage"):
            return deny("lots.manage")
        prepared.append((sku, qty, lot, exp))
    if not prepared:
        return err("Tidak ada kuantitas yang diterima")
    no = next_number("IN")
    cur = db.execute("INSERT INTO receipts(number,purchase_order_id,status,warehouse_code,created_by) VALUES(?,?,'Waiting',?,?)",
                     (no, oid, wh, user()))
    for sku, qty, lot, exp in prepared:
        db.execute("INSERT INTO receipt_lines(receipt_id,sku,received_qty,accepted_qty,rejected_qty,lot_number,expiry_date) "
                   "VALUES(?,?,?,0,0,?,?)",
                   (cur.lastrowid, sku, qty, lot, exp))
    audit(user(), "Create Receipt", no, f"{po['number']} · " + ", ".join(
        f"{s}×{q}" + (f" lot {l}" if l else "") + (f" exp {e}" if e else "") for s, q, l, e in prepared) + " · menunggu QC")
    audit(user(), "Receipt created", po["number"], no)
    return ok({"id": cur.lastrowid, "number": no, "status": "Waiting"}, 201)


@bp.patch("/receipts/<int:rid>/lines")
@require("receipt.view")
@tx
def edit_receipt_lines(rid):
    """Percobaan mengubah accepted qty di luar Quality ditolak (SR-06/SR-11, T-22)."""
    db = get_db()
    r = one("SELECT * FROM receipts WHERE id=?", (rid,))
    if not r:
        return err("Receipt tidak ditemukan", 404)
    lines = body().get("lines", [])
    if any(x.get("accepted_qty") not in (None, "") or x.get("rejected_qty") not in (None, "") for x in lines):
        return blocked("Blocked accepted override", r["number"],
                       f"{role()} mencoba mengubah accepted/rejected setelah QC" if r["qc_number"] else
                       f"{role()} mencoba mengisi accepted tanpa QC",
                       "Accepted/rejected quantity hanya dapat diubah melalui Quality Check oleh role Quality "
                       "(SR-06/SR-11). Unit Fail tidak dapat dinyatakan Accepted.", qc_number=r["qc_number"])
    if r["status"] != "Waiting" or not allowed("receipt.create"):
        return err("Receipt tidak dapat diubah pada status ini", 409)
    for x in lines:
        line = one("SELECT * FROM receipt_lines WHERE receipt_id=? AND sku=?", (rid, x.get("sku")))
        if not line:
            return err("SKU tidak ada di receipt")
        qty = as_int(x.get("received_qty"), "Received qty")
        pol = one("SELECT quantity FROM purchase_order_lines WHERE order_id=? AND sku=?", (r["purchase_order_id"], x["sku"]))
        if qty <= 0 or received_so_far(r["purchase_order_id"], x["sku"], rid) + qty > pol["quantity"]:
            return blocked("Blocked over-receipt", r["number"], f"{x['sku']} → {qty}",
                           "Kuantitas melebihi PO; ajukan revisi PO (SR-06).")
        db.execute("UPDATE receipt_lines SET received_qty=? WHERE id=?", (qty, line["id"]))
    audit(user(), "Edit Receipt", r["number"], "Received qty diubah sebelum QC")
    return ok({"status": r["status"]})


@bp.post("/receipts/<int:rid>/quality-check")
@require("quality.check")
@tx
def quality_check(rid):
    db = get_db()
    r = one("SELECT * FROM receipts WHERE id=?", (rid,))
    if not r:
        return err("Receipt tidak ditemukan", 404)
    if r["status"] == "Done":
        return err("Receipt sudah Done; QC tidak dapat diubah", 409)
    lines = {l["sku"]: l for l in db.execute("SELECT * FROM receipt_lines WHERE receipt_id=?", (rid,))}
    data = {x.get("sku"): x for x in body().get("lines", [])}
    if set(data) != set(lines):
        return err("Isi hasil QC untuk setiap SKU pada receipt")
    changes = []
    for sku, l in lines.items():
        passed = as_int(data[sku].get("passed", 0), "Pass")
        failed = as_int(data[sku].get("failed", 0), "Fail")
        reason = (data[sku].get("reason") or "").strip()
        if passed < 0 or failed < 0 or passed + failed != l["received_qty"]:
            return err(f"{sku}: Pass + Fail harus sama dengan inspected {l['received_qty']}")
        if failed and not reason:
            return err(f"{sku}: alasan Fail wajib diisi")
        changes.append(f"{sku} Pass={passed} Fail={failed}" + (f" ({reason})" if failed else "")
                       + (f" [koreksi dari Pass={l['accepted_qty']} Fail={l['rejected_qty']}]" if r["qc_number"] else ""))
        db.execute("UPDATE receipt_lines SET accepted_qty=?, rejected_qty=?, quality_reason=? WHERE id=?",
                   (passed, failed, reason or None, l["id"]))
    qc = r["qc_number"] or next_number("QC")
    db.execute("UPDATE receipts SET status='Quality Checked', qc_number=?, qc_by=?, qc_at=CURRENT_TIMESTAMP WHERE id=?",
               (qc, user(), rid))
    action = "QC correction" if r["qc_number"] else "Quality Check"
    audit(user(), action, qc, f"{r['number']}: " + "; ".join(changes))
    audit(user(), action, r["number"], f"{qc}: " + "; ".join(changes))
    return ok({"qc_number": qc, "status": "Quality Checked"})


@bp.post("/receipts/<int:rid>/validate")
@require("receipt.validate")
@tx
def validate_receipt(rid):
    db = get_db()
    r = one("SELECT * FROM receipts WHERE id=?", (rid,))
    if not r:
        return err("Receipt tidak ditemukan", 404)
    if r["status"] == "Done":
        return ok({"status": "Done", "idempotent": True})
    if r["status"] != "Quality Checked":
        return err("Quality Check Pass/Fail wajib dilakukan sebelum Receipt divalidasi (SR-11)", 409)
    if db.execute("UPDATE receipts SET status='Done', validated_by=?, validated_at=CURRENT_TIMESTAMP WHERE id=? AND "
                  "status='Quality Checked'", (user(), rid)).rowcount != 1:
        return ok({"status": "Done", "idempotent": True})
    po = one("SELECT * FROM purchase_orders WHERE id=?", (r["purchase_order_id"],))
    value = 0
    for l in db.execute("SELECT * FROM receipt_lines WHERE receipt_id=?", (rid,)).fetchall():
        pol = one("SELECT quantity FROM purchase_order_lines WHERE order_id=? AND sku=?", (po["id"], l["sku"]))
        if received_so_far(po["id"], l["sku"]) > pol["quantity"]:
            return err("Total receipt melebihi PO (SR-06)", 409)
        if l["accepted_qty"] and (l["lot_number"] or l["expiry_date"]):
            db.execute("INSERT INTO lots(lot_number,sku,warehouse_code,expiry_date,received_qty,remaining_qty,receipt_id,"
                       "status,inspected_by) VALUES(?,?,?,?,?,?,?,'Released',?)",
                       (l["lot_number"] or f"{r['number']}-{l['sku']}", l["sku"], r["warehouse_code"], l["expiry_date"],
                        l["accepted_qty"], l["accepted_qty"], rid, r["qc_by"]))
        if l["accepted_qty"]:
            add_stock(l["sku"], r["warehouse_code"], l["accepted_qty"])
            cost = stock_move(r["number"], "Receipt", l["sku"], f"Vendor {po['vendor_code']}", r["warehouse_code"],
                              l["accepted_qty"], user())
            value += cost * l["accepted_qty"]
        if l["rejected_qty"]:
            stock_move(r["number"], "Rejected (not stocked)", l["sku"], f"Vendor {po['vendor_code']}", "Rejected/Return to vendor",
                       0, user())
            audit(user(), "Rejected not stocked", r["number"], f"{l['sku']} {l['rejected_qty']} unit: {l['quality_reason']}")
    jno = post_journal("Receipt", rid, r["number"], [("1200", value, 0, "Stock in (accepted only)"),
                                                     ("1210", 0, value, "GRNI")], user(), f"Receipt {po['number']}") if value else None
    audit(user(), "Validate Receipt", r["number"], f"Accepted value {idr(value)} masuk stock; {jno or 'tanpa jurnal'}")
    audit(user(), "Receipt validated", po["number"], r["number"])
    return ok({"status": "Done", "accepted_value": value, "journal_number": jno})


# ---------------------------------------------------------------- Vendor Bill three-way match (SR-05, SR-06, F-14)
@bp.post("/vendor-bills/from-receipt/<int:rid>")
@require("bills.create")
@tx
def bill_from_receipt(rid):
    db = get_db()
    r = one("SELECT * FROM receipts WHERE id=?", (rid,))
    if not r or r["status"] != "Done":
        return err("Receipt belum tervalidasi", 409)
    existing = one("SELECT * FROM vendor_bills WHERE receipt_id=? AND status<>'Cancelled'", (rid,))
    if existing:
        return ok({"id": existing["id"], "number": existing["number"], "idempotent": True,
                   "message": "Receipt ini sudah memiliki Vendor Bill"})
    po = one("SELECT * FROM purchase_orders WHERE id=?", (r["purchase_order_id"],))
    claimed_map = body().get("claimed") or {}
    rows, notes = [], []
    for l in db.execute("SELECT rl.*, pol.unit_cost, pol.quantity ordered FROM receipt_lines rl JOIN purchase_order_lines pol "
                        "ON pol.order_id=? AND pol.sku=rl.sku WHERE rl.receipt_id=?", (po["id"], rid)):
        claimed = as_int(claimed_map.get(l["sku"], l["accepted_qty"]), "Claimed qty")
        billed = min(claimed, l["accepted_qty"])
        net = billed * l["unit_cost"]
        rows.append((l["sku"], l["ordered"], l["accepted_qty"], claimed, billed, l["unit_cost"], net, tax_of(net)))
        if claimed > l["accepted_qty"]:
            notes.append(f"{l['sku']}: vendor menagih {claimed}, accepted {l['accepted_qty']} → selisih "
                         f"{claimed - l['accepted_qty']} unit ditandai & tidak dibukukan")
    net = sum(x[6] for x in rows)
    tax = sum(x[7] for x in rows)
    no = next_number("BILL")
    status = "Mismatch" if notes else "Matched"
    cur = db.execute("INSERT INTO vendor_bills(number,purchase_order_id,receipt_id,status,net_amount,tax_amount,total,"
                     "match_status,match_note,created_at) VALUES(?,?,?,'Draft',?,?,?,?,?,CURRENT_TIMESTAMP)",
                     (no, po["id"], rid, net, tax, net + tax, status, "; ".join(notes) or None))
    for x in rows:
        db.execute("INSERT INTO vendor_bill_lines(bill_id,sku,ordered_qty,accepted_qty,claimed_qty,billed_qty,unit_cost,"
                   "net_amount,tax_amount) VALUES(?,?,?,?,?,?,?,?,?)", (cur.lastrowid, *x))
    audit(user(), "Create Vendor Bill", no, f"Three-way match {po['number']}/{r['number']}: {status}"
          + (f" — {'; '.join(notes)}" if notes else ""))
    audit(user(), "Bill drafted", po["number"], no)
    return ok({"id": cur.lastrowid, "number": no, "net": net, "tax": tax, "total": net + tax,
               "match_status": status, "match_note": "; ".join(notes)}, 201)


@bp.post("/vendor-bills/<int:bid>/resolve")
@require("bills.post")
@tx
def resolve_bill(bid):
    b = one("SELECT * FROM vendor_bills WHERE id=?", (bid,))
    if not b or b["status"] != "Draft" or b["match_status"] != "Mismatch":
        return err("Bill tidak dalam status Mismatch", 409)
    get_db().execute("UPDATE vendor_bills SET match_status='Matched (accepted qty)' WHERE id=?", (bid,))
    audit(user(), "Resolve mismatch", b["number"], f"Ditagih sebatas accepted qty; selisih dikembalikan ke vendor: {b['match_note']}")
    return ok({"match_status": "Matched (accepted qty)"})


@bp.post("/vendor-bills/<int:bid>/post")
@require("bills.post")
@tx
def post_bill(bid):
    db = get_db()
    b = one("SELECT * FROM vendor_bills WHERE id=?", (bid,))
    if not b:
        return err("Bill tidak ditemukan", 404)
    if b["status"] == "Posted":
        return ok({"status": "Posted", "idempotent": True})
    if b["match_status"] == "Mismatch":
        return blocked("Blocked bill posting", b["number"], b["match_note"],
                       f"Posting ditahan: {b['match_note']}. Selesaikan selisih (tagih sebatas accepted) dulu (SR-05/SR-06).")
    if db.execute("UPDATE vendor_bills SET status='Posted', posted_at=CURRENT_TIMESTAMP, posted_by=? WHERE id=? AND "
                  "status='Draft'", (user(), bid)).rowcount != 1:
        return ok({"status": "Posted", "idempotent": True})
    std = scalar("SELECT COALESCE(SUM(bl.billed_qty*p.standard_cost),0) FROM vendor_bill_lines bl JOIN products p "
                 "ON p.sku=bl.sku WHERE bl.bill_id=?", (bid,))
    po = one("SELECT * FROM purchase_orders WHERE id=?", (b["purchase_order_id"],))
    jno = post_journal("Vendor Bill", bid, b["number"], [
        ("1210", std, 0, "Clear GRNI"),
        ("1200", b["net_amount"] - std if b["net_amount"] > std else 0, std - b["net_amount"] if std > b["net_amount"] else 0,
         "Price difference"),
        ("1300", b["tax_amount"], 0, "VAT input 11%"),
        ("2100", 0, b["total"], f"AP {po['vendor_code']}")], user(), f"Bill {po['number']}")
    audit(user(), "Post Vendor Bill", b["number"], f"AP +{idr(b['total'])}; GRNI cleared {idr(std)}; {jno}")
    return ok({"status": "Posted", "journal_number": jno})


# ---------------------------------------------------------------- Payment (SR-10, F-16)
def pay_status(total, paid, credited=0):
    residual = total - paid - credited
    return "Paid" if residual <= 0 else ("Partial" if paid or credited else "Not Paid")


@bp.post("/payments")
@require("payments.create")
@tx
def payment():
    d = body()
    db = get_db()
    typ = d.get("document_type")
    table = "invoices" if typ == "customer" else "vendor_bills" if typ == "vendor" else None
    if not table:
        return err("Jenis dokumen pembayaran tidak valid")
    try:
        amount = as_int(d.get("amount"), "Jumlah pembayaran")
        docid = as_int(d.get("document_id"), "Dokumen")
    except ValueError as e:
        return blocked("Payment rejected", None, f"Input {d.get('amount')!r}", str(e), 400)
    doc = one(f"SELECT * FROM {table} WHERE id=?", (docid,))
    if not doc or doc["status"] != "Posted":
        return err("Dokumen harus Posted", 409)
    credited = doc["credited_amount"] if typ == "customer" else 0
    residual = doc["total"] - doc["paid_amount"] - credited
    if amount <= 0 or amount > residual:
        return blocked("Payment rejected", doc["number"], f"Amount {idr(amount)} vs residual {idr(residual)}",
                       f"Pembayaran harus positif dan ≤ residual {idr(residual)} (SR-10). Ditolak: {idr(amount)}.",
                       residual=residual)
    no = next_number("PAY")
    paid = doc["paid_amount"] + amount
    status = pay_status(doc["total"], paid, credited)
    db.execute(f"UPDATE {table} SET paid_amount=?, payment_status=? WHERE id=?", (paid, status, docid))
    cur = db.execute("INSERT INTO payments(number,document_type,document_id,amount,created_by) VALUES(?,?,?,?,?)",
                     (no, typ, docid, amount, user()))
    lines = [("1010", amount, 0, "Bank in"), ("1100", 0, amount, "Clear AR")] if typ == "customer" else \
        [("2100", amount, 0, "Clear AP"), ("1010", 0, amount, "Bank out")]
    jno = post_journal("Payment", cur.lastrowid, no, lines, user(), f"Payment {doc['number']}")
    db.execute("UPDATE payments SET journal_number=? WHERE id=?", (jno, cur.lastrowid))
    audit(user(), "Register Payment", no, f"{doc['number']} {idr(amount)}; residual {idr(residual - amount)}; {status}")
    audit(user(), "Payment registered", doc["number"], f"{no} {idr(amount)} → {status}")
    return ok({"id": cur.lastrowid, "number": no, "residual": residual - amount, "status": status,
               "journal_number": jno}, 201)


# ---------------------------------------------------------------- Internal Transfer (SR-12, F-17)
@bp.post("/transfers")
@require("transfer.create")
@tx
def transfer():
    d = body()
    sku, src, dst = d.get("sku"), d.get("from_warehouse"), d.get("to_warehouse")
    qty = as_int(d.get("quantity", 0), "Quantity")
    if not one("SELECT 1 FROM products WHERE sku=?", (sku,)):
        return err("SKU tidak ditemukan")
    if src == dst or qty <= 0 or not one("SELECT 1 FROM warehouses WHERE code=?", (src,)) or \
            not one("SELECT 1 FROM warehouses WHERE code=?", (dst,)):
        return err("Transfer tidak valid (lokasi harus berbeda, qty > 0)")
    av = available(sku, src)
    if qty > av:
        return err(f"Available {sku} di {src} hanya {av} (reservasi pesanan dilindungi)", 409)
    no = next_number("INT")
    cur = get_db().execute("INSERT INTO transfers(number,from_warehouse,to_warehouse,sku,quantity,status,created_by) "
                           "VALUES(?,?,?,?,?,'Ready',?)", (no, src, dst, sku, qty, user()))
    audit(user(), "Create Transfer", no, f"{src} → {dst}, {sku} × {qty}")
    resp = {"id": cur.lastrowid, "number": no, "status": "Ready"}
    return ok(resp, 201)


@bp.post("/transfers/<int:tid>/validate")
@require("transfer.validate")
@tx
def validate_transfer(tid):
    db = get_db()
    t = one("SELECT * FROM transfers WHERE id=?", (tid,))
    if not t:
        return err("Transfer tidak ditemukan", 404)
    if t["status"] == "Done":  # T-30
        return ok({"status": "Done", "idempotent": True, "message": "Transfer sudah Done; stock move kedua tidak dibuat"})
    if db.execute("UPDATE transfers SET status='Done', validated_by=?, validated_at=CURRENT_TIMESTAMP WHERE id=? AND "
                  "status='Ready'", (user(), tid)).rowcount != 1:
        return ok({"status": "Done", "idempotent": True})
    av = available(t["sku"], t["from_warehouse"])
    if t["quantity"] > av:
        return err(f"Available di {t['from_warehouse']} hanya {av}", 409)
    db.execute("UPDATE stock SET on_hand=on_hand-? WHERE sku=? AND warehouse_code=?", (t["quantity"], t["sku"], t["from_warehouse"]))
    add_stock(t["sku"], t["to_warehouse"], t["quantity"])
    stock_move(t["number"], "Internal Transfer", t["sku"], t["from_warehouse"], t["to_warehouse"], t["quantity"], user())
    audit(user(), "Validate Transfer", t["number"], f"{t['from_warehouse']} −{t['quantity']} / {t['to_warehouse']} +{t['quantity']}; "
                                                   "nilai persediaan total tidak berubah (tanpa jurnal)")
    return ok({"status": "Done", "number": t["number"]})


# ---------------------------------------------------------------- Return & Credit Note (SR-13, SR-14, F-18)
# Alur 4 peran: Sales request -> Quality inspection -> Warehouse stock move -> Finance credit note + AR adjustment
RET_ACTIVE = ("Requested", "Inspected", "Received", "Done")
RET_STOCKED = ("Received", "Done")


def return_cap(inv, sku, statuses=RET_ACTIVE, exclude_id=None):
    line_qty = scalar("SELECT COALESCE(SUM(quantity),0) FROM invoice_lines WHERE invoice_id=? AND sku=?", (inv["id"], sku))
    sql = "SELECT COALESCE(SUM(quantity),0) FROM returns WHERE invoice_id=? AND sku=? AND status IN ({})".format(
        ",".join("?" * len(statuses)))
    args = [inv["id"], sku, *statuses]
    if exclude_id:
        sql += " AND id<>?"
        args.append(exclude_id)
    ret_inv = scalar(sql, args)
    own = scalar("SELECT quantity FROM returns WHERE id=?", (exclude_id,)) if exclude_id else 0
    net_delivered = delivered_qty(inv["order_id"], sku) - returned_qty(inv["order_id"], sku, statuses) + own
    return max(0, min(line_qty - ret_inv, net_delivered))


@bp.post("/returns")
@require("returns.create")
@tx
def create_return():
    d = body()
    db = get_db()
    iid = as_int(d.get("invoice_id", 0), "Invoice")
    sku = d.get("sku")
    qty = as_int(d.get("quantity", 0), "Quantity")
    inv = one("SELECT * FROM invoices WHERE id=? AND status='Posted'", (iid,))
    line = one("SELECT * FROM invoice_lines WHERE invoice_id=? AND sku=?", (iid, sku)) if inv else None
    if not inv or not line or qty <= 0:
        return err("Invoice Posted / SKU / qty tidak valid")
    cap = return_cap(inv, sku)
    if qty > cap:
        return blocked("Blocked return", inv["number"], f"{sku}: diminta {qty}, sisa dapat diretur {cap}",
                       f"Return maksimal {cap} unit (net delivered − previously returned) untuk {sku} (SR-13).", cap=cap)
    credit_net = half_up(Fraction(line["net_amount"] * qty, line["quantity"]))
    credit_tax = tax_of(credit_net)
    so = one("SELECT * FROM sales_orders WHERE id=?", (inv["order_id"],))
    cost = scalar("SELECT standard_cost FROM products WHERE sku=?", (sku,))
    no = next_number("RET")
    cur = db.execute("INSERT INTO returns(number,invoice_id,sku,quantity,status,credit_total,credit_net,credit_tax,"
                     "cogs_reversal,inspection,reason,warehouse_code,created_by) VALUES(?,?,?,?,'Requested',?,?,?,?,NULL,?,?,?)",
                     (no, iid, sku, qty, credit_net + credit_tax, credit_net, credit_tax, qty * cost,
                      d.get("reason"), so["warehouse_code"], user()))
    audit(user(), "Return requested", no, f"{inv['number']} {sku} × {qty}; menunggu return inspection Quality")
    audit(user(), "Return requested", inv["number"], no)
    return ok({"id": cur.lastrowid, "number": no, "status": "Requested", "credit_net": credit_net,
               "credit_tax": credit_tax, "credit_total": credit_net + credit_tax, "cogs_reversal": qty * cost}, 201)


@bp.post("/returns/<int:retid>/inspect")
@require("returns.inspect")
@tx
def inspect_return(retid):
    r = one("SELECT * FROM returns WHERE id=?", (retid,))
    if not r:
        return err("Return tidak ditemukan", 404)
    if r["status"] not in ("Requested", "Inspected"):
        return err("Return sudah diproses gudang; hasil inspeksi terkunci", 409)
    d = body()
    result = d.get("inspection")
    if result not in ("Saleable", "Damaged"):
        return err("Hasil inspeksi harus Saleable atau Damaged")
    note = (d.get("note") or "").strip()
    if result == "Damaged" and not note:
        return err("Catatan kerusakan wajib diisi untuk barang Damaged")
    get_db().execute("UPDATE returns SET status='Inspected', inspection=?, reason=COALESCE(NULLIF(?,''),reason), "
                     "inspected_by=?, inspected_at=CURRENT_TIMESTAMP WHERE id=?", (result, note, user(), retid))
    audit(user(), "Return inspection", r["number"], f"{result}" + (f" — {note}" if note else "")
          + (f" (koreksi dari {r['inspection']})" if r["inspection"] else ""))
    return ok({"status": "Inspected", "inspection": result})


@bp.post("/returns/<int:retid>/receive")
@require("returns.receive")
@tx
def receive_return(retid):
    """Warehouse memproses return stock move: Saleable masuk stok, Damaged ke Scrap (6100 Quality Loss)."""
    db = get_db()
    r = one("SELECT * FROM returns WHERE id=?", (retid,))
    if not r:
        return err("Return tidak ditemukan", 404)
    if r["status"] in RET_STOCKED:
        return ok({"status": r["status"], "idempotent": True, "message": "Stock move retur sudah dicatat; tidak diulang"})
    if r["status"] != "Inspected":
        return err("Return wajib diinspeksi Quality sebelum diproses gudang", 409)
    inv = one("SELECT * FROM invoices WHERE id=?", (r["invoice_id"],))
    if r["quantity"] > return_cap(inv, r["sku"], RET_STOCKED):
        return err("Return melebihi net delivered − previously returned (SR-13)", 409)
    if db.execute("UPDATE returns SET status='Received', received_by=?, received_at=CURRENT_TIMESTAMP WHERE id=? AND "
                  "status='Inspected'", (user(), retid)).rowcount != 1:
        return ok({"status": "Received", "idempotent": True})
    if r["inspection"] == "Saleable":
        add_stock(r["sku"], r["warehouse_code"], r["quantity"])
        stock_move(r["number"], "Customer Return", r["sku"], "Customer", r["warehouse_code"], r["quantity"], user())
        lines = [("1200", r["cogs_reversal"], 0, "Stock back (saleable)"), ("5100", 0, r["cogs_reversal"], "COGS reversal")]
    else:
        stock_move(r["number"], "Customer Return (damaged)", r["sku"], "Customer", "Scrap", r["quantity"], user())
        lines = [("6100", r["cogs_reversal"], 0, "Quality loss (damaged return)"), ("5100", 0, r["cogs_reversal"], "COGS reversal")]
    jno = post_journal("Return COGS", retid, r["number"], lines, user(), f"Return {inv['number']}")
    audit(user(), "Return stock move", r["number"], f"{r['inspection']}: {r['sku']} × {r['quantity']} → "
          f"{r['warehouse_code'] if r['inspection'] == 'Saleable' else 'Scrap'}; COGS reversal {idr(r['cogs_reversal'])}; {jno}")
    return ok({"status": "Received", "journal_number": jno})


@bp.post("/returns/<int:retid>/validate")
@require("returns.validate")
@tx
def validate_return(retid):
    """Finance: Credit Note + AR adjustment."""
    db = get_db()
    r = one("SELECT * FROM returns WHERE id=?", (retid,))
    if not r:
        return err("Return tidak ditemukan", 404)
    if r["status"] == "Done":  # T-32 credit note ganda
        return ok({"status": "Done", "idempotent": True, "credit_note_number": r["credit_note_number"],
                   "message": "Credit Note sudah dibuat; tidak ada kredit kedua"})
    if r["status"] != "Received":
        return err("Credit Note dibuat setelah barang retur diinspeksi Quality dan diproses Warehouse", 409)
    if db.execute("UPDATE returns SET status='Done', validated_by=?, validated_at=CURRENT_TIMESTAMP WHERE id=? AND "
                  "status='Received'", (user(), retid)).rowcount != 1:
        return ok({"status": "Done", "idempotent": True})
    inv = one("SELECT * FROM invoices WHERE id=?", (r["invoice_id"],))
    so = one("SELECT * FROM sales_orders WHERE id=?", (inv["order_id"],))
    cn = next_number("RINV")
    j2 = post_journal("Credit Note", retid, cn, [("4100", r["credit_net"], 0, "Reverse revenue"),
                                                 ("2200", r["credit_tax"], 0, "Reverse VAT output"),
                                                 ("1100", 0, r["credit_total"], f"AR adjustment {so['customer_code']}")],
                      user(), f"Credit note {inv['number']}")
    credited = inv["credited_amount"] + r["credit_total"]
    db.execute("UPDATE invoices SET credited_amount=?, payment_status=? WHERE id=?",
               (credited, pay_status(inv["total"], inv["paid_amount"], credited), inv["id"]))
    db.execute("UPDATE returns SET credit_note_number=? WHERE id=?", (cn, retid))
    j1 = scalar("SELECT number FROM journal_entries WHERE source_type='Return COGS' AND source_id=?", (retid,))
    audit(user(), "Credit Note + AR adjustment", r["number"], f"{cn}: net {idr(r['credit_net'])} + PPN {idr(r['credit_tax'])}"
          f" = {idr(r['credit_total'])}; {j2}")
    audit(user(), "Credit Note", inv["number"], f"{cn} {idr(r['credit_total'])}")
    audit(user(), "Credit Note posted", cn, r["number"])
    return ok({"status": "Done", "credit_note_number": cn, "journals": [j for j in (j1, j2) if j]})


# ---------------------------------------------------------------- Accounting (SR-15, SR-16, F-15)
@bp.get("/accounting/trial-balance")
@require("accounting.view")
def trial_balance():
    rows = rowdicts(get_db().execute(
        "SELECT a.code account_code, a.name account_name, COALESCE(SUM(jl.debit),0) debit, COALESCE(SUM(jl.credit),0) credit, "
        "COALESCE(SUM(jl.debit),0)-COALESCE(SUM(jl.credit),0) balance FROM accounts a LEFT JOIN journal_lines jl "
        "ON jl.account_code=a.code GROUP BY a.code ORDER BY a.code"))
    td = sum(x["debit"] for x in rows)
    tc = sum(x["credit"] for x in rows)
    return ok({"lines": rows, "total_debit": td, "total_credit": tc, "difference": td - tc})


@bp.get("/accounting/ledger/<code>")
@require("accounting.view")
def ledger(code):
    rows = rowdicts(get_db().execute(
        "SELECT j.id journal_id, j.number, j.entry_date, j.reference, j.source_type, jl.label, jl.debit, jl.credit "
        "FROM journal_lines jl JOIN journal_entries j ON j.id=jl.journal_id WHERE jl.account_code=? ORDER BY j.id", (code,)))
    bal = 0
    for r in rows:
        bal += r["debit"] - r["credit"]
        r["running_balance"] = bal
    return ok({"account": code, "lines": rows, "balance": bal})


@bp.get("/journals/<int:jid>")
@require("accounting.view")
def journal_detail(jid):
    return ok(doc_journal(jid))


@bp.get("/reports")
@require("reports.view")
def reports():
    db = get_db()
    return ok({"sales_by_status": rowdicts(db.execute("SELECT status,COUNT(*) count,SUM(total) amount FROM sales_orders GROUP BY status")),
               "purchase_by_status": rowdicts(db.execute("SELECT status,COUNT(*) count,SUM(total) amount FROM purchase_orders GROUP BY status")),
               "stock_by_warehouse": rowdicts(db.execute("SELECT warehouse_code,SUM(on_hand) units FROM stock GROUP BY warehouse_code"))})


# ---------------------------------------------------------------- generic document form (Form view + smart buttons + log)
def rel(kind, row, label=None):
    if not row:
        return None
    return {"kind": kind, "id": row["id"], "number": row["number"], "label": label or row["number"],
            "status": row["status"] if "status" in row.keys() else None}


def journals_for(source_type, source_id):
    return [rel("journal", j, f"Journal {j['number']}") for j in get_db().execute(
        "SELECT * FROM journal_entries WHERE source_type=? AND source_id=?", (source_type, source_id))]


def doc_sale(oid):
    db = get_db()
    so = one("SELECT so.*, c.name customer_name FROM sales_orders so JOIN customers c ON c.code=so.customer_code WHERE so.id=?", (oid,))
    if not so:
        return None
    lines = so_lines_status(so)
    related = []
    if so["lead_id"]:
        related.append(rel("lead", one("SELECT id,number,stage status FROM leads WHERE id=?", (so["lead_id"],)), "Opportunity"))
    if so["revision_of"]:
        related.append(rel("sale", one("SELECT id,number,status FROM sales_orders WHERE id=?", (so["revision_of"],)), "Revisi dari"))
    for r in db.execute("SELECT id,number,status FROM sales_orders WHERE revision_of=?", (oid,)):
        related.append(rel("sale", r, f"Revisi → {r['number']}"))
    for r in db.execute("SELECT id,number,status FROM deliveries WHERE order_id=?", (oid,)):
        related.append(rel("delivery", r, f"Delivery {r['number']}"))
        related += journals_for("Delivery", r["id"])
    for r in db.execute("SELECT id,number,status FROM invoices WHERE order_id=?", (oid,)):
        related.append(rel("invoice", r, f"Invoice {r['number']}"))
        for p in db.execute("SELECT id,number,'Posted' status FROM payments WHERE document_type='customer' AND document_id=?", (r["id"],)):
            related.append(rel("payment", p, f"Payment {p['number']}"))
        for x in db.execute("SELECT id,number,status FROM returns WHERE invoice_id=?", (r["id"],)):
            related.append(rel("return", x, f"Return {x['number']}"))
    res = [dict(x) for x in db.execute("SELECT * FROM reservations WHERE document_no=? ORDER BY id", (so["number"],))]
    ci = credit_info(so["customer_code"])
    eff = effective_discount(oid)
    status = so["status"]
    steps = ["Quotation", "Pending Approval", "Confirmed", "Locked"] if status != "Cancelled" else ["Quotation", "Cancelled"]
    return {"kind": "sale", "id": oid, "number": so["number"], "status": status,
            "title": "Quotation" if status in ("Quotation", "Pending Approval") else "Sales Order",
            "steps": steps, "current": "Locked" if status == "Confirmed" and any(l["delivered_qty"] for l in lines) else status,
            "fields": [["Customer", f"{so['customer_code']} — {so['customer_name']}"], ["Document", so["number"]],
                       ["Warehouse", so["warehouse_code"]], ["Discount", f"{so['discount_pct']:g}% (efektif {eff}%)"],
                       ["Discount approval", so["discount_approved_by"] or ("Diperlukan Owner" if eff > 10 else "Tidak perlu")],
                       ["Created by", so["created_by"]], ["Created at", so["created_at"]], ["Confirmed at", so["confirmed_at"]],
                       ["Credit exposure", ci["exposure"]], ["Credit limit", ci["credit_limit"]],
                       ["Price lock", "Terkunci (SR-08)" if status not in ("Quotation", "Pending Approval") else "Dapat diedit"]],
            "lines": {"columns": ["sku", "product_name", "ordered_qty", "unit_price", "discount_pct", "subtotal", "tax", "total",
                                  "delivered_qty", "backorder_qty", "invoiced_qty", "returned_qty"], "rows": lines},
            "totals": [["Untaxed (Net)", so["subtotal"]], ["PPN 11%", so["tax"]], ["Grand Total", so["total"]]],
            "related": [r for r in related if r], "reservations": res, "raw": dict(so), "customer_code": so["customer_code"]}


def doc_delivery(did):
    db = get_db()
    d = one("SELECT d.*, so.number sales_order, so.id so_id, so.customer_code, c.name customer_name FROM deliveries d "
            "JOIN sales_orders so ON so.id=d.order_id JOIN customers c ON c.code=so.customer_code WHERE d.id=?", (did,))
    if not d:
        return None
    lines = []
    for l in db.execute("SELECT dl.*, p.name, p.size, p.unit, p.standard_cost, sol.quantity ordered FROM delivery_lines dl "
                        "JOIN products p ON p.sku=dl.sku JOIN sales_order_lines sol ON sol.order_id=? AND sol.sku=dl.sku "
                        "WHERE dl.delivery_id=?", (d["order_id"], did)):
        tot = delivered_qty(d["order_id"], l["sku"])
        lines.append({"sku": l["sku"], "product_name": f"{l['name']} {l['size'] or ''}".strip(), "unit": l["unit"],
                      "ordered_qty": l["ordered"], "delivery_qty": l["quantity"], "delivered_total": tot,
                      "backorder_qty": max(0, l["ordered"] - tot), "standard_cost": l["standard_cost"],
                      "cogs_amount": l["quantity"] * l["standard_cost"]})
    j = one("SELECT * FROM journal_entries WHERE source_type='Delivery' AND source_id=?", (did,))
    cogs = sum(x["cogs_amount"] for x in lines)
    backorder = sum(x["backorder_qty"] for x in lines)
    return {"kind": "delivery", "id": did, "number": d["number"], "status": d["status"], "title": "Delivery Order",
            "steps": ["Ready", "Partial", "Done"],
            "current": d["status"] if d["status"] != "Done" else ("Partial" if backorder else "Done"),
            "fields": [["Order", d["sales_order"]], ["Customer", f"{d['customer_code']} — {d['customer_name']}"],
                       ["Warehouse", d["warehouse_code"]], ["Created at", d["created_at"]],
                       ["Validated at", d["validated_at"]], ["Validated by", d["validated_by"]],
                       ["Backorder", f"{backorder} unit"], ["COGS policy", "Standard cost"]],
            "lines": {"columns": ["sku", "product_name", "ordered_qty", "delivery_qty", "delivered_total", "backorder_qty",
                                  "standard_cost", "cogs_amount"], "rows": lines},
            "totals": [["Total unit", sum(x["delivery_qty"] for x in lines)], ["COGS delivered", cogs]],
            "related": [rel("sale", {"id": d["so_id"], "number": d["sales_order"], "status": None}, f"SO {d['sales_order']}")]
                       + ([rel("journal", j, f"Journal {j['number']}")] if j else []),
            # kompatibilitas UI lama
            "sales_order": d["sales_order"], "customer_code": d["customer_code"], "customer_name": d["customer_name"],
            "warehouse_code": d["warehouse_code"], "created_at": d["created_at"], "validated_at": d["validated_at"],
            "total_cogs": cogs, "total_quantity": sum(x["delivery_qty"] for x in lines),
            "journal_entry": dict(j) if j else None}


def doc_invoice(iid):
    db = get_db()
    i = one("SELECT i.*, so.number sales_order, so.id so_id, so.customer_code, c.name customer_name FROM invoices i "
            "JOIN sales_orders so ON so.id=i.order_id JOIN customers c ON c.code=so.customer_code WHERE i.id=?", (iid,))
    if not i:
        return None
    lines = rowdicts(db.execute("SELECT il.sku, p.name product_name, il.quantity, il.unit_price, il.discount_amount, "
                                "il.net_amount, il.tax_amount, il.net_amount+il.tax_amount total FROM invoice_lines il "
                                "JOIN products p ON p.sku=il.sku WHERE il.invoice_id=?", (iid,)))
    related = [rel("sale", {"id": i["so_id"], "number": i["sales_order"], "status": None}, f"SO {i['sales_order']}")]
    for r in db.execute("SELECT id,number,status FROM deliveries WHERE order_id=? AND status='Done'", (i["so_id"],)):
        related.append(rel("delivery", r, f"Source delivery {r['number']}"))
    related += journals_for("Customer Invoice", iid)
    for p in db.execute("SELECT id,number,'Posted' status FROM payments WHERE document_type='customer' AND document_id=?", (iid,)):
        related.append(rel("payment", p, f"Payment {p['number']}"))
    for x in db.execute("SELECT id,number,status FROM returns WHERE invoice_id=?", (iid,)):
        related.append(rel("return", x, f"Return {x['number']}"))
    residual = i["total"] - i["paid_amount"] - i["credited_amount"]
    cur = "Paid" if i["status"] == "Posted" and i["payment_status"] == "Paid" else i["status"]
    return {"kind": "invoice", "id": iid, "number": i["number"], "status": i["status"], "title": "Customer Invoice",
            "steps": ["Draft", "Posted", "Paid"], "current": cur,
            "fields": [["Customer", f"{i['customer_code']} — {i['customer_name']}"], ["Sales Order", i["sales_order"]],
                       ["Source delivery", ", ".join(f"{l['quantity']} × {l['sku']}" for l in lines)],
                       ["Tax", "PPN efektif 11% (12% × 11/12), half-up per line"], ["Invoice number", i["number"]],
                       ["Payment status", i["payment_status"]], ["Posted at", i["posted_at"]], ["Posted by", i["posted_by"]]],
            "lines": {"columns": ["sku", "product_name", "quantity", "unit_price", "discount_amount", "net_amount", "tax_amount",
                                  "total"], "rows": lines},
            "totals": [["Untaxed Amount", i["net_amount"]], ["Tax", i["tax_amount"]], ["Total", i["total"]],
                       ["Paid", i["paid_amount"]], ["Credited", i["credited_amount"]], ["Amount Due", residual]],
            "related": related, "residual": residual, "raw": dict(i)}


def doc_purchase(oid):
    db = get_db()
    po = one("SELECT po.*, v.name vendor_name FROM purchase_orders po JOIN vendors v ON v.code=po.vendor_code WHERE po.id=?", (oid,))
    if not po:
        return None
    lines = []
    for l in db.execute("SELECT pol.*, p.name FROM purchase_order_lines pol JOIN products p ON p.sku=pol.sku WHERE order_id=?", (oid,)):
        rec = scalar("SELECT COALESCE(SUM(rl.received_qty),0) FROM receipt_lines rl JOIN receipts r ON r.id=rl.receipt_id "
                     "WHERE r.purchase_order_id=? AND rl.sku=? AND r.status='Done'", (oid, l["sku"]))
        acc = scalar("SELECT COALESCE(SUM(rl.accepted_qty),0) FROM receipt_lines rl JOIN receipts r ON r.id=rl.receipt_id "
                     "WHERE r.purchase_order_id=? AND rl.sku=? AND r.status='Done'", (oid, l["sku"]))
        billed = scalar("SELECT COALESCE(SUM(bl.billed_qty),0) FROM vendor_bill_lines bl JOIN vendor_bills b ON b.id=bl.bill_id "
                        "WHERE b.purchase_order_id=? AND bl.sku=? AND b.status='Posted'", (oid, l["sku"]))
        lines.append({"sku": l["sku"], "product_name": l["name"], "quantity": l["quantity"], "unit_cost": l["unit_cost"],
                      "subtotal": l["subtotal"], "tax": l["tax"], "received_qty": rec, "accepted_qty": acc, "billed_qty": billed})
    related = []
    for r in db.execute("SELECT id,number,status FROM receipts WHERE purchase_order_id=?", (oid,)):
        related.append(rel("receipt", r, f"Receipt {r['number']}"))
    for b in db.execute("SELECT id,number,status FROM vendor_bills WHERE purchase_order_id=?", (oid,)):
        related.append(rel("bill", b, f"Bill {b['number']}"))
    status = po["status"]
    return {"kind": "purchase", "id": oid, "number": po["number"], "status": status,
            "title": "RFQ" if status in ("RFQ", "Pending Approval") else "Purchase Order",
            "steps": ["RFQ", "Pending Approval", "Purchase Order"],
            "current": "Purchase Order" if status == "Confirmed" else status,
            "fields": [["Vendor", f"{po['vendor_code']} — {po['vendor_name']}"], ["Currency", "IDR"],
                       ["Approval threshold", f"Subtotal > {idr(setting('large_po_threshold'))}"],
                       ["Approved by", po["approved_by"]], ["Approved at", po["approved_at"]],
                       ["Created by", po["created_by"]], ["Confirmed at", po["confirmed_at"]]],
            "lines": {"columns": ["sku", "product_name", "quantity", "unit_cost", "subtotal", "tax", "received_qty",
                                  "accepted_qty", "billed_qty"], "rows": lines},
            "totals": [["Untaxed Amount", po["subtotal"]], ["PPN simulasi", po["tax"]], ["Gross Amount", po["total"]]],
            "related": related, "raw": dict(po)}


def doc_receipt(rid):
    db = get_db()
    r = one("SELECT r.*, po.number purchase_order, po.id po_id, po.vendor_code FROM receipts r JOIN purchase_orders po "
            "ON po.id=r.purchase_order_id WHERE r.id=?", (rid,))
    if not r:
        return None
    lines = rowdicts(db.execute(
        "SELECT rl.sku, p.name product_name, pol.quantity ordered_qty, rl.received_qty inspected, rl.accepted_qty accepted, "
        "rl.rejected_qty rejected, rl.quality_reason fail_reason, rl.lot_number, rl.expiry_date, pol.unit_cost, rl.accepted_qty*p.standard_cost accepted_value, "
        "rl.rejected_qty*p.standard_cost rejected_value FROM receipt_lines rl JOIN products p ON p.sku=rl.sku "
        "JOIN purchase_order_lines pol ON pol.order_id=? AND pol.sku=rl.sku WHERE rl.receipt_id=?", (r["po_id"], rid)))
    related = [rel("purchase", {"id": r["po_id"], "number": r["purchase_order"], "status": None}, f"PO {r['purchase_order']}")]
    related += journals_for("Receipt", rid)
    for b in db.execute("SELECT id,number,status FROM vendor_bills WHERE receipt_id=?", (rid,)):
        related.append(rel("bill", b, f"Bill {b['number']}"))
    hist_refs = [r["number"]] + ([r["qc_number"]] if r["qc_number"] else [])
    return {"kind": "receipt", "id": rid, "number": r["number"], "status": r["status"], "title": "Receipt & Accepted Qty",
            "steps": ["Waiting", "Quality Hold", "Done"],
            "current": {"Waiting": "Waiting", "Quality Checked": "Quality Hold", "Done": "Done"}.get(r["status"], r["status"]),
            "fields": [["Purchase Order", r["purchase_order"]], ["Vendor", r["vendor_code"]], ["Warehouse", r["warehouse_code"]],
                       ["Quality Check", r["qc_number"] or "Belum (wajib sebelum validasi)"], ["Inspector", r["qc_by"]],
                       ["QC at", r["qc_at"]], ["Validated by", r["validated_by"]], ["Validated at", r["validated_at"]]],
            "lines": {"columns": ["sku", "product_name", "lot_number", "expiry_date", "ordered_qty", "inspected", "accepted",
                                  "rejected", "fail_reason", "accepted_value", "rejected_value"], "rows": lines},
            "totals": [["Inspected", sum(l["inspected"] for l in lines)], ["Accepted", sum(l["accepted"] for l in lines)],
                       ["Rejected", sum(l["rejected"] for l in lines)],
                       ["Accepted value (masuk stock)", sum(l["accepted_value"] for l in lines)],
                       ["Rejected value potensial (tidak masuk stock)", sum(l["rejected_value"] for l in lines)]],
            "related": related, "history_refs": hist_refs, "raw": dict(r)}


def doc_bill(bid):
    db = get_db()
    b = one("SELECT b.*, po.number purchase_order, po.vendor_code, r.number receipt FROM vendor_bills b JOIN purchase_orders po "
            "ON po.id=b.purchase_order_id JOIN receipts r ON r.id=b.receipt_id WHERE b.id=?", (bid,))
    if not b:
        return None
    lines = rowdicts(db.execute("SELECT sku, ordered_qty, accepted_qty, claimed_qty, billed_qty, claimed_qty-billed_qty "
                                "disputed_qty, unit_cost, net_amount, tax_amount FROM vendor_bill_lines WHERE bill_id=?", (bid,)))
    related = [rel("purchase", {"id": b["purchase_order_id"], "number": b["purchase_order"], "status": None}, f"PO {b['purchase_order']}"),
               rel("receipt", {"id": b["receipt_id"], "number": b["receipt"], "status": None}, f"Receipt {b['receipt']}")]
    related += journals_for("Vendor Bill", bid)
    for p in db.execute("SELECT id,number,'Posted' status FROM payments WHERE document_type='vendor' AND document_id=?", (bid,)):
        related.append(rel("payment", p, f"Payment {p['number']}"))
    acc = sum(l["accepted_qty"] for l in lines)
    ordered = sum(l["ordered_qty"] for l in lines)
    return {"kind": "bill", "id": bid, "number": b["number"], "status": b["status"], "title": "Vendor Bill & Three-way Match",
            "steps": ["Draft", "Posted", "Paid"], "current": "Paid" if b["payment_status"] == "Paid" else b["status"],
            "fields": [["Vendor", b["vendor_code"]], ["PO Reference", b["purchase_order"]], ["Receipt", b["receipt"]],
                       ["Receipt Accepted", f"{acc} / {ordered}"], ["Tax", "PPN efektif 11%"],
                       ["Three-way match", b["match_status"]], ["Selisih", b["match_note"] or "—"],
                       ["Payment status", b["payment_status"]]],
            "lines": {"columns": ["sku", "ordered_qty", "accepted_qty", "claimed_qty", "billed_qty", "disputed_qty", "unit_cost",
                                  "net_amount", "tax_amount"], "rows": lines},
            "totals": [["Untaxed", b["net_amount"]], ["Tax", b["tax_amount"]], ["Total", b["total"]],
                       ["Paid", b["paid_amount"]], ["Residual", b["total"] - b["paid_amount"]]],
            "related": related, "residual": b["total"] - b["paid_amount"], "raw": dict(b)}


def doc_payment(pid):
    p = one("SELECT * FROM payments WHERE id=?", (pid,))
    if not p:
        return None
    kind = "invoice" if p["document_type"] == "customer" else "bill"
    doc = one(f"SELECT id,number,status FROM {'invoices' if kind == 'invoice' else 'vendor_bills'} WHERE id=?", (p["document_id"],))
    return {"kind": "payment", "id": pid, "number": p["number"], "status": "Posted", "title": "Payment",
            "steps": ["Draft", "Posted"], "current": "Posted",
            "fields": [["Type", "Customer payment (Bank)" if kind == "invoice" else "Vendor payment (Bank)"],
                       ["Document", doc["number"]], ["Amount", p["amount"]], ["Journal", p["journal_number"]],
                       ["Created by", p["created_by"]], ["Date", p["payment_date"]]],
            "lines": None, "totals": [["Amount", p["amount"]]],
            "related": [rel(kind, doc)] + journals_for("Payment", pid), "raw": dict(p)}


def doc_transfer(tid):
    t = one("SELECT * FROM transfers WHERE id=?", (tid,))
    if not t:
        return None
    moves = rowdicts(get_db().execute("SELECT * FROM stock_moves WHERE reference=?", (t["number"],)))
    return {"kind": "transfer", "id": tid, "number": t["number"], "status": t["status"], "title": "Internal Stock Transfer",
            "steps": ["Draft", "Ready", "Done"], "current": t["status"],
            "fields": [["SKU", t["sku"]], ["From", t["from_warehouse"]], ["To", t["to_warehouse"]],
                       ["Quantity", t["quantity"]], ["Created by", t["created_by"]], ["Validated by", t["validated_by"]],
                       ["Validated at", t["validated_at"]],
                       [f"{t['from_warehouse']} on hand", on_hand(t["sku"], t["from_warehouse"])],
                       [f"{t['to_warehouse']} on hand", on_hand(t["sku"], t["to_warehouse"])],
                       ["Company total", scalar("SELECT SUM(on_hand) FROM stock WHERE sku=?", (t["sku"],))]],
            "lines": {"columns": ["move_type", "sku", "from_location", "to_location", "quantity", "value", "created_at"],
                      "rows": moves},
            "totals": [["Stock moves", len(moves)]], "related": [], "raw": dict(t)}


def doc_return(retid):
    r = one("SELECT r.*, i.number invoice, i.order_id FROM returns r JOIN invoices i ON i.id=r.invoice_id WHERE r.id=?", (retid,))
    if not r:
        return None
    so = one("SELECT id,number,status FROM sales_orders WHERE id=?", (r["order_id"],))
    related = [rel("invoice", {"id": r["invoice_id"], "number": r["invoice"], "status": None}, f"Invoice {r['invoice']}"),
               rel("sale", so, f"SO {so['number']}")]
    related += journals_for("Return COGS", retid) + journals_for("Credit Note", retid)
    for d in get_db().execute("SELECT id,number,status FROM deliveries WHERE order_id=? AND status='Done'", (r["order_id"],)):
        related.append(rel("delivery", d, f"Original delivery {d['number']}"))
    return {"kind": "return", "id": retid, "number": r["number"], "status": r["status"], "title": "Return & Credit Note",
            "steps": ["Requested", "Inspected", "Received", "Credited"],
            "current": "Credited" if r["status"] == "Done" else r["status"],
            "fields": [["Original invoice", r["invoice"]], ["SKU", r["sku"]], ["Return quantity", r["quantity"]],
                       ["Requested by (Sales)", r["created_by"]], ["Return inspection (Quality)", r["inspection"] or "Belum diperiksa"],
                       ["Inspected by", r["inspected_by"]], ["Reason / catatan", r["reason"]],
                       ["Stock move (Warehouse)", r["received_by"] or "Belum diproses"], ["Warehouse", r["warehouse_code"]],
                       ["Credit Note (Finance)", r["credit_note_number"]], ["Credited by", r["validated_by"]]],
            "lines": None,
            "totals": [["Untaxed Credit", r["credit_net"]], ["Tax Credit", r["credit_tax"]],
                       ["Refund / AR Adjustment", r["credit_total"]], ["COGS reversal", r["cogs_reversal"]]],
            "related": related, "history_refs": [r["number"]] + ([r["credit_note_number"]] if r["credit_note_number"] else []),
            "raw": dict(r)}


SOURCE_KIND = {"Delivery": ("delivery", "deliveries"), "Customer Invoice": ("invoice", "invoices"),
               "Receipt": ("receipt", "receipts"), "Vendor Bill": ("bill", "vendor_bills"),
               "Payment": ("payment", "payments"), "Return COGS": ("return", "returns"), "Credit Note": ("return", "returns")}


def doc_journal(jid):
    j = one("SELECT * FROM journal_entries WHERE id=?", (jid,))
    if not j:
        return None
    lines = rowdicts(get_db().execute("SELECT jl.account_code, a.name account_name, jl.label, jl.debit, jl.credit FROM journal_lines jl "
                                      "LEFT JOIN accounts a ON a.code=jl.account_code WHERE journal_id=?", (jid,)))
    td = sum(l["debit"] for l in lines)
    tc = sum(l["credit"] for l in lines)
    related = []
    if j["source_type"] in SOURCE_KIND:
        kind, table = SOURCE_KIND[j["source_type"]]
        src = one(f"SELECT id, number, {'status' if table != 'payments' else chr(39) + 'Posted' + chr(39)} status FROM {table} WHERE id=?",
                  (j["source_id"],))
        related.append(rel(kind, src, f"Source {src['number']}" if src else None))
    return {"kind": "journal", "id": jid, "number": j["number"], "status": j["status"], "title": "Journal Entry",
            "steps": ["Draft", "Posted"], "current": j["status"],
            "fields": [["Reference", j["reference"]], ["Date", j["entry_date"]], ["Move type", j["source_type"]],
                       ["Posting policy", "Standard cost"], ["Memo", j["memo"]], ["Created by", j["created_by"]]],
            "lines": {"columns": ["account_code", "account_name", "label", "debit", "credit"], "rows": lines},
            "totals": [["Debit", td], ["Credit", tc], ["Balance Difference", td - tc]],
            "related": [r for r in related if r], "history_refs": [j["reference"], j["number"]]}


def doc_lead(lid):
    l = one("SELECT l.*, c.name customer_name FROM leads l LEFT JOIN customers c ON c.code=l.customer_code WHERE l.id=?", (lid,))
    if not l:
        return None
    hist = rowdicts(get_db().execute(
        "SELECT created_at, 'Stage' activity_type, COALESCE(from_stage,'—') || ' → ' || to_stage summary, actor FROM lead_stage_history "
        "WHERE lead_id=? UNION ALL SELECT created_at, activity_type, summary, actor FROM lead_activities WHERE lead_id=? "
        "ORDER BY created_at", (lid, lid)))
    related = []
    if l["quotation_id"]:
        related.append(rel("sale", one("SELECT id,number,status FROM sales_orders WHERE id=?", (l["quotation_id"],)), "Quotation"))
    return {"kind": "lead", "id": lid, "number": l["number"], "status": l["stage"], "title": "Opportunity",
            "steps": ["New", "Qualified", "Proposition", "Won"], "current": l["stage"],
            "fields": [["Opportunity", l["number"]], ["Customer", f"{l['customer_code']} — {l['customer_name']}"],
                       ["Title", l["title"]], ["Expected SKU", l["expected_sku"]], ["Expected qty", l["expected_qty"]],
                       ["Stage", l["stage"]], ["Revenue", "Rp0 (revenue hanya dari invoice posted — SR-18)"]],
            "lines": {"columns": ["created_at", "activity_type", "summary", "actor"], "rows": hist},
            "totals": [], "related": related, "raw": dict(l)}


DOC_BUILDERS = {"sale": ("sales.view", doc_sale), "delivery": ("delivery.view", doc_delivery),
                "invoice": ("invoicing.view", doc_invoice), "purchase": ("purchase.view", doc_purchase),
                "receipt": ("receipt.view", doc_receipt), "bill": ("bills.view", doc_bill),
                "payment": ("payments.view", doc_payment), "transfer": ("transfer.view", doc_transfer),
                "return": ("returns.view", doc_return), "journal": ("accounting.view", doc_journal),
                "lead": ("crm.view", doc_lead)}


@bp.get("/doc/<kind>/<int:did>")
def document_form(kind, did):
    if not check_active():
        return err("Authentication required", 401)
    if kind not in DOC_BUILDERS:
        return err("Unknown document", 404)
    perm, fn = DOC_BUILDERS[kind]
    if not allowed(perm):
        return deny(perm)
    if kind in DOC_SCOPE and staff_scoped(DOC_SCOPE[kind][0]):
        owner_ = scalar(f"SELECT created_by FROM {DOC_SCOPE[kind][1]} WHERE id=?", (did,))
        if owner_ != user():
            return err("Staff hanya dapat membuka dokumen yang ia buat sendiri; dokumen tim dipantau Manager.", 403,
                       required_permission="level Manager")
    doc = fn(did)
    if not doc:
        return err("Dokumen tidak ditemukan", 404)
    refs = doc.get("history_refs") or [doc["number"]]
    q = ",".join("?" * len(refs))
    doc["history"] = rowdicts(get_db().execute(f"SELECT * FROM audit_logs WHERE document_ref IN ({q}) ORDER BY id", refs))
    # smart link yang tidak boleh diakses role ini ditandai (UI menampilkan terkunci)
    for r in doc.get("related", []):
        r["allowed"] = allowed(DOC_BUILDERS[r["kind"]][0])
    return ok(doc)


# ---------------------------------------------------------------- seed reset
@bp.post("/seed/reset")
@require("system.reset")
def reset_seed():
    db = get_db()
    db.execute("PRAGMA foreign_keys = OFF")
    for t in RESET_TABLES:
        db.execute(f"DELETE FROM {t}")
    db.execute("DELETE FROM sqlite_sequence")
    db.commit()
    db.execute("PRAGMA foreign_keys = ON")
    seed_db()
    actor = session.get("user", {}).get("username", "owner")
    audit(actor, "Seed reset", None, "Baseline dikembalikan")
    db.commit()
    return ok({"message": "Baseline reset berhasil"})


# ---------------------------------------------------------------- cetak invoice (Print / Save as PDF)
INVOICE_PRINT = """<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{{ i.number }} · PT Segar Rasa Riau</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Manrope:wght@700;800&display=swap');
*{box-sizing:border-box} body{margin:0;background:#f3efe2;font:13px 'DM Sans',system-ui,'Segoe UI',Arial,sans-serif;color:#1e2b22}
.bar{max-width:820px;margin:18px auto 0;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.bar a,.bar button{font:700 13px 'DM Sans',sans-serif;border:1px solid #d9d0b4;background:#fff;color:#1e2b22;padding:9px 14px;border-radius:8px;cursor:pointer;text-decoration:none}
.bar .pri{background:#2e7d4f;color:#fff;border-color:#2e7d4f}
.page{max-width:820px;margin:12px auto 30px;background:#fff;padding:44px 48px;border-radius:6px;box-shadow:0 10px 40px #6b530018;position:relative;overflow:hidden}
.page:before{content:"";position:absolute;left:0;top:0;right:0;height:8px;background:linear-gradient(90deg,#f4c430,#9ccb3b,#2e7d4f)}
.head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}
.brand{display:flex;gap:12px;align-items:center}.mark{width:46px;height:46px;border-radius:13px;background:#f4c430;display:grid;place-items:center;font:800 16px Manrope,sans-serif;color:#17311f}
.brand b{display:block;font:800 18px Manrope,sans-serif}.muted{color:#6e7768}
h1{font:800 30px Manrope,sans-serif;margin:0;text-align:right;letter-spacing:.5px}
.no{text-align:right;font-weight:700;font-size:15px;margin-top:2px}
.pill{display:inline-block;margin-top:8px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:#e8f4ea;color:#2e7d4f}
.pill.draft{background:#fff5cc;color:#6b5300}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:32px 0 24px}
.meta h3{margin:0 0 6px;font-size:11px;letter-spacing:1.4px;color:#6b5300;text-transform:uppercase}
.meta p{margin:2px 0}
table{width:100%;border-collapse:collapse;margin-top:6px} th{background:#fff5cc;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.8px;padding:9px 8px;color:#3d3410}
td{padding:10px 8px;border-bottom:1px solid #eee7d3} .r{text-align:right}
.tot{margin-left:auto;width:320px;margin-top:16px} .tot div{display:flex;justify-content:space-between;padding:6px 8px}
.tot .grand{border-top:2px solid #1e2b22;font:800 16px Manrope,sans-serif;margin-top:4px;padding-top:10px}
.tot .due{background:#e8f4ea;border-radius:6px;font-weight:700;color:#17311f}
.foot{margin-top:36px;display:flex;justify-content:space-between;gap:24px;font-size:12px}
.sign{text-align:center;width:200px}.sign .line{border-top:1px solid #1e2b22;margin-top:64px;padding-top:4px}
.wm{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font:800 110px Manrope,sans-serif;color:#f4c43022;pointer-events:none}
@media print{body{background:#fff}.bar{display:none}.page{box-shadow:none;margin:0;max-width:none;border-radius:0;padding:24px 28px}
 @page{size:A4;margin:12mm} th{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page:before,.mark,.due,.pill{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="bar">
 <button class="pri" onclick="window.print()">Cetak / Simpan PDF</button>
 {% if mailto %}<a href="{{ mailto }}">Kirim via email</a>{% endif %}
 <button onclick="window.close()">Tutup</button>
</div>
<div class="page">
 {% if i.status != 'Posted' %}<div class="wm">DRAFT</div>{% endif %}
 <div class="head">
  <div class="brand"><div class="mark">SR</div><div><b>PT Segar Rasa Riau</b><span class="muted">Pekanbaru, Riau · Distributor minuman &amp; camilan</span></div></div>
  <div><h1>INVOICE</h1><div class="no">{{ i.number }}</div>
   <div style="text-align:right"><span class="pill {{ 'draft' if i.status != 'Posted' else '' }}">{{ status_label }}</span></div></div>
 </div>
 <div class="meta">
  <div><h3>Ditagihkan kepada</h3><p><b>{{ c.name }}</b> ({{ c.code }})</p>
   {% if c.contact_person %}<p>u.p. {{ c.contact_person }}</p>{% endif %}
   {% if c.address %}<p>{{ c.address }}</p>{% elif c.city %}<p>{{ c.city }}</p>{% endif %}
   {% if c.phone %}<p>{{ c.phone }}</p>{% endif %}{% if c.email %}<p>{{ c.email }}</p>{% endif %}</div>
  <div style="text-align:right"><h3>Detail</h3>
   <p>Tanggal invoice: <b>{{ inv_date }}</b></p><p>Sales Order: <b>{{ i.sales_order }}</b></p>
   <p>Termin pembayaran: <b>{{ c.payment_terms or '-' }}</b></p><p>Pajak: PPN 11% (VAT11)</p></div>
 </div>
 <table><thead><tr><th>SKU</th><th>Produk</th><th class="r">Qty</th><th class="r">Harga</th><th class="r">Diskon</th><th class="r">DPP</th><th class="r">PPN</th><th class="r">Jumlah</th></tr></thead>
 <tbody>{% for l in lines %}<tr><td>{{ l.sku }}</td><td>{{ l.product_name }}</td><td class="r">{{ l.quantity }}</td><td class="r">{{ rp(l.unit_price) }}</td>
 <td class="r">{{ rp(l.discount_amount) }}</td><td class="r">{{ rp(l.net_amount) }}</td><td class="r">{{ rp(l.tax_amount) }}</td><td class="r">{{ rp(l.net_amount + l.tax_amount) }}</td></tr>{% endfor %}</tbody></table>
 <div class="tot">
  <div><span>Subtotal (DPP)</span><span>{{ rp(i.net_amount) }}</span></div>
  <div><span>PPN 11%</span><span>{{ rp(i.tax_amount) }}</span></div>
  <div class="grand"><span>Total</span><span>{{ rp(i.total) }}</span></div>
  {% if i.paid_amount %}<div><span>Sudah dibayar</span><span>− {{ rp(i.paid_amount) }}</span></div>{% endif %}
  {% if i.credited_amount %}<div><span>Credit note (retur)</span><span>− {{ rp(i.credited_amount) }}</span></div>{% endif %}
  <div class="due"><span>Sisa tagihan</span><span>{{ rp(residual) }}</span></div>
 </div>
 <div class="foot"><div class="muted">Dokumen ini dibuat otomatis oleh SegarRasa ERP pada {{ printed }} WIB.<br>Mohon cantumkan nomor {{ i.number }} saat melakukan pembayaran.</div>
  <div class="sign">Hormat kami,<div class="line">Finance · PT Segar Rasa Riau</div></div></div>
</div></body></html>"""


@bp.get("/invoices/<int:iid>/print")
@require("invoicing.view")
def print_invoice(iid):
    from flask import render_template_string
    from urllib.parse import quote
    db = get_db()
    i = one("SELECT i.*, so.number sales_order, so.customer_code FROM invoices i JOIN sales_orders so ON so.id=i.order_id "
            "WHERE i.id=?", (iid,))
    if not i:
        return err("Invoice tidak ditemukan", 404)
    c = one("SELECT * FROM customers WHERE code=?", (i["customer_code"],))
    lines = rowdicts(db.execute("SELECT il.*, p.name product_name FROM invoice_lines il JOIN products p ON p.sku=il.sku "
                                "WHERE il.invoice_id=? ORDER BY il.id", (iid,)))
    residual = i["total"] - i["paid_amount"] - i["credited_amount"]
    rp = lambda n: "Rp " + f"{int(n or 0):,}".replace(",", ".")
    status_label = ("LUNAS" if residual <= 0 else "BELUM LUNAS" if i["payment_status"] != "Partial" else "DIBAYAR SEBAGIAN") \
        if i["status"] == "Posted" else "DRAFT · belum di-post"
    mailto = None
    if i["status"] == "Posted":
        body = (f"Yth. {c['contact_person'] or c['name']},\n\nBersama ini kami kirimkan invoice {i['number']} "
                f"(Sales Order {i['sales_order']}) sebesar {rp(i['total'])}, sisa tagihan {rp(residual)}.\n"
                f"File PDF invoice terlampir.\n\nTerima kasih,\nFinance PT Segar Rasa Riau")
        mailto = f"mailto:{quote(c['email'] or '')}?subject={quote('Invoice ' + i['number'] + ' - PT Segar Rasa Riau')}&body={quote(body)}"
    actor = session.get("user", {}).get("username", "system")
    audit(actor, "Print invoice", i["number"], status_label)
    db.commit()
    return render_template_string(INVOICE_PRINT, i=i, c=c, lines=lines, residual=residual, rp=rp, mailto=mailto,
                                  status_label=status_label, inv_date=(i["posted_at"] or i["created_at"] or "")[:10],
                                  printed=f"{now_wib():%d-%m-%Y %H:%M}")


# ---------------------------------------------------------------- backup & restore database (Master Admin)
@bp.get("/admin/backup")
@require("system.reset")
def backup_database():
    """Unduh salinan lengkap database (transaksi, stok, user, audit trail)."""
    import os, sqlite3, tempfile
    from flask import send_file
    actor = session.get("user", {}).get("username", "admin")
    audit(actor, "Database backup", None, "Salinan database diunduh")
    get_db().commit()
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    dst = sqlite3.connect(path)
    get_db().backup(dst)
    dst.close()
    resp = send_file(path, as_attachment=True, mimetype="application/vnd.sqlite3",
                     download_name=f"segarrasa_backup_{now_wib():%Y-%m-%d_%H%M}.db")
    resp.call_on_close(lambda: os.path.exists(path) and os.remove(path))
    return resp


@bp.post("/admin/restore")
@require("system.reset")
def restore_database():
    """Ganti seluruh isi database dengan file backup (mis. memindahkan data lokal ke server online)."""
    import os, sqlite3, tempfile
    from .db import SCHEMA, migrate, seed_security
    f = request.files.get("file")
    if not f:
        return err("Pilih file backup .db terlebih dahulu")
    data = f.read()
    if not data.startswith(b"SQLite format 3\x00"):
        return err("File bukan database SegarRasa ERP (format SQLite tidak dikenali)")
    fd, path = tempfile.mkstemp(suffix=".db")
    with os.fdopen(fd, "wb") as fh:
        fh.write(data)
    try:
        src = sqlite3.connect(path)
        src.row_factory = sqlite3.Row
        if src.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            return err("File backup rusak (integrity check gagal)")
        tables = {r[0] for r in src.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        need = {"users", "audit_logs", "sales_orders", "stock", "journal_entries", "products"}
        if not need <= tables:
            return err("File ini bukan backup SegarRasa ERP", missing=sorted(need - tables))
        if not src.execute("SELECT 1 FROM users WHERE role='Admin' AND active=1").fetchone():
            return err("Backup tidak punya Master Admin aktif; restore dibatalkan agar Anda tidak terkunci")
        db = get_db()
        if db.in_transaction:
            db.commit()
        src.backup(db)
        src.close()
        db.executescript(SCHEMA)
        migrate(db)
        seed_security(db)
        actor = session.get("user", {}).get("username", "admin")
        audit(actor, "Database restore", None, f"Dipulihkan dari {f.filename or 'backup'} ({len(data)//1024} KB)")
        db.commit()
    finally:
        try:
            os.remove(path)
        except OSError:
            pass
    return ok({"message": "Database berhasil dipulihkan. Silakan login ulang.", "relogin": True})


# ================================================================ analisis tambahan tim (dipertahankan)
@bp.get("/products/analysis")
@require("products.view")
def product_analysis():
    db = get_db()

    # Minimum stok bersifat opsional untuk percobaan
    raw_minimum = request.args.get("minimum")
    minimum = None

    if raw_minimum is not None:
        try:
            minimum = int(raw_minimum)
            if minimum < 0:
                raise ValueError()
        except ValueError:
            return jsonify({
                "error": "Minimum stok harus angka 0 atau lebih"
            }), 400

    # Ambil data produk dan stok dari database
    rows = db.execute("""
        SELECT
            p.sku,
            p.name,
            p.size,
            p.unit,
            p.sales_price,
            p.standard_cost,
            s.warehouse_code,
            s.on_hand,
            rp.min_available,
            COALESCE((
                SELECT SUM(r.quantity)
                FROM reservations r
                WHERE r.sku = s.sku
                  AND r.warehouse_code = s.warehouse_code
                  AND r.active = 1
            ), 0) AS reserved
        FROM products p
        JOIN stock s ON s.sku = p.sku
        LEFT JOIN reorder_points rp
        ON rp.sku = s.sku
        AND rp.warehouse_code = s.warehouse_code
        WHERE p.active = 1
        ORDER BY p.sku, s.warehouse_code
    """).fetchall()

    results = []

    for row in rows:
        product = dict(row)

        # Hitung stok yang tersedia
        product["available"] = (
            product["on_hand"] - product["reserved"]
        )

        # Hitung nilai persediaan
        product["stock_value"] = (
            product["on_hand"] * product["standard_cost"]
        )

        # Hitung potensi margin kotor per unit
        product["margin_per_unit"] = (
            product["sales_price"] - product["standard_cost"]
        )

        # Tentukan status stok
        if product["min_available"] is None:
            product["stock_status"] = "Belum diatur"
        elif product["available"] <= product["min_available"]:
            product["stock_status"] = "Stok menipis"
        else:
            product["stock_status"] = "Normal"

        results.append(product)

    return ok(results)


@bp.post("/products/reorder-point")
@require("warehouses.manage")
def save_reorder_point():
    data = request.get_json(silent=True) or {}

    if not isinstance(data, dict):
        return jsonify({
            "error": "Format data tidak valid"
        }), 400

    sku = str(data.get("sku") or "").strip()
    warehouse = str(data.get("warehouse_code") or "").strip()
    minimum = data.get("min_available")

    # Validasi input
    if not sku or not warehouse:
        return jsonify({
            "error": "SKU dan gudang wajib diisi"
        }), 400

    if type(minimum) is not int or minimum < 0:
        return jsonify({
            "error": "Minimum stok harus bilangan bulat >= 0"
        }), 400

    db = get_db()

    # Pastikan produk dan gudang tersedia
    stock = db.execute("""
        SELECT 1 FROM stock
        WHERE sku = ? AND warehouse_code = ?
    """, (sku, warehouse)).fetchone()

    if not stock:
        return jsonify({
            "error": "Produk atau gudang tidak ditemukan"
        }), 404

    # Simpan atau perbarui minimum stok
    db.execute("""
        INSERT INTO reorder_points
            (sku, warehouse_code, min_available)
        VALUES (?, ?, ?)
        ON CONFLICT(sku, warehouse_code)
        DO UPDATE SET
            min_available = excluded.min_available
    """, (sku, warehouse, minimum))

    # Simpan riwayat perubahan
    audit(
        user(),
        "Set Minimum Stock",
        f"{sku}/{warehouse}",
        f"Minimum available: {minimum}"
    )

    db.commit()

    return ok({
        "sku": sku,
        "warehouse_code": warehouse,
        "min_available": minimum
    })


@bp.get("/products/performance")
@require("products.view")
def products_performance():
    db = get_db()

    # Periode analisis: default 30 hari
    try:
        days = int(request.args.get("days", "30"))
    except (TypeError, ValueError):
        return jsonify({
            "error": "Periode harus berupa angka"
        }), 400

    if days < 1 or days > 365:
        return jsonify({
            "error": "Periode harus 1 sampai 365 hari"
        }), 400

    # 1. Ambil seluruh produk aktif
    products = db.execute("""
        SELECT
            sku,
            name,
            size,
            unit,
            sales_price,
            standard_cost
        FROM products
        WHERE active = 1
        ORDER BY sku
    """).fetchall()

    # 2. Ambil stok dan minimum stok per gudang
    stock_rows = db.execute("""
        SELECT
            s.sku,
            s.warehouse_code,
            s.on_hand,
            rp.min_available,
            COALESCE((
                SELECT SUM(r.quantity)
                FROM reservations r
                WHERE r.sku = s.sku
                  AND r.warehouse_code = s.warehouse_code
                  AND r.active = 1
            ), 0) AS reserved
        FROM stock s
        LEFT JOIN reorder_points rp
            ON rp.sku = s.sku
           AND rp.warehouse_code = s.warehouse_code
    """).fetchall()

    stock_by_sku = {}

    for row in stock_rows:
        stock_by_sku.setdefault(
            row["sku"], []
        ).append(dict(row))

    # 3. Hitung produk terkirim pada periode
    # Hanya Delivery berstatus Done
    delivery_rows = db.execute("""
        SELECT
            dl.sku,
            SUM(dl.quantity) AS total_sold,
            COUNT(DISTINCT d.id) AS delivery_count
        FROM delivery_lines dl
        JOIN deliveries d
            ON d.id = dl.delivery_id
        WHERE d.status = 'Done'
          AND d.validated_at IS NOT NULL
          AND datetime(d.validated_at) >= datetime('now', ?)
        GROUP BY dl.sku
    """, (f"-{days} days",)).fetchall()

    sales_by_sku = {
        row["sku"]: dict(row)
        for row in delivery_rows
    }

    total_delivered = sum(
        row["total_sold"] for row in delivery_rows
    )

    # 4. Hitung pendapatan dari Invoice Posted
    # SO Confirmed belum dianggap revenue
    invoice_rows = db.execute("""
        SELECT
            il.sku,
            SUM(il.quantity) AS invoiced_qty,
            SUM(il.net_amount) AS net_sales
        FROM invoice_lines il
        JOIN invoices i
            ON i.id = il.invoice_id
        WHERE i.status = 'Posted'
        GROUP BY il.sku
    """).fetchall()

    invoice_by_sku = {
        row["sku"]: dict(row)
        for row in invoice_rows
    }

    # 5. Retur dicatat terpisah untuk evaluasi
    return_rows = db.execute("""
        SELECT
            sku,
            SUM(quantity) AS returned_qty
        FROM returns
        WHERE status = 'Done'
        GROUP BY sku
    """).fetchall()

    returns_by_sku = {
        row["sku"]: row["returned_qty"]
        for row in return_rows
    }

    results = []

    for p in products:
        sku = p["sku"]
        locations = stock_by_sku.get(sku, [])

        # Jumlah stok seluruh lokasi
        on_hand = sum(
            r["on_hand"] for r in locations
        )

        reserved = sum(
            r["reserved"] for r in locations
        )

        available = on_hand - reserved

        # Penjualan berdasarkan Delivery Done
        sales = sales_by_sku.get(sku, {})

        total_sold = sales.get("total_sold", 0)
        delivery_count = sales.get("delivery_count", 0)

        # Nilai inventory
        stock_value = (
            on_hand * p["standard_cost"]
        )

        # Margin potensial per unit
        margin_per_unit = (
            p["sales_price"] - p["standard_cost"]
        )

        # Keuntungan berdasarkan Posted Invoice
        invoice = invoice_by_sku.get(sku)

        if invoice is None:
            net_sales = None
            estimated_cogs = None
            gross_profit = None
            profit_margin = None
        else:
            net_sales = invoice["net_sales"]

            estimated_cogs = (
                invoice["invoiced_qty"]
                * p["standard_cost"]
            )

            gross_profit = (
                net_sales - estimated_cogs
            )

            profit_margin = (
                round(gross_profit / net_sales * 100, 2)
                if net_sales > 0 else None
            )

        # Cek lokasi dengan stok menipis
        low_stock_locations = []
        configured_locations = 0

        for r in locations:
            minimum = r["min_available"]

            if minimum is None:
                continue

            configured_locations += 1

            location_available = (
                r["on_hand"] - r["reserved"]
            )

            if location_available <= minimum:
                low_stock_locations.append(
                    r["warehouse_code"]
                )

        # Klasifikasi pergerakan produk
        if total_delivered == 0:
            movement_status = "Data belum cukup"
        elif total_sold == 0:
            movement_status = "0 terkirim - perlu evaluasi"
        else:
            movement_status = "Ada pengiriman"

        # Rekomendasi untuk Finance
        if configured_locations == 0:
            recommendation = (
                "Minimum stok belum diatur"
            )

        elif low_stock_locations and total_sold > 0:
            recommendation = (
                "Pertimbangkan restock"
            )

        elif low_stock_locations:
            recommendation = (
                "Stok menipis - evaluasi kebutuhan"
            )

        else:
            recommendation = (
                "Stok cukup pada lokasi terkonfigurasi"
            )

        results.append({
            "sku": sku,
            "product": (
                f'{p["name"]} {p["size"] or ""}'
            ).strip(),

            "on_hand": on_hand,
            "reserved": reserved,
            "available": available,
            "stock_value": stock_value,

            "total_sold_period": total_sold,
            "delivery_count": delivery_count,
            "movement_status": movement_status,

            "margin_per_unit": margin_per_unit,

            "posted_net_sales": net_sales,
            "estimated_cogs": estimated_cogs,
            "estimated_gross_profit": gross_profit,
            "estimated_profit_margin_pct": profit_margin,

            "returned_qty": returns_by_sku.get(sku, 0),

            "low_stock_locations": (
                ", ".join(low_stock_locations)
                if low_stock_locations else "—"
            ),

            "restock_recommendation": recommendation
        })

    # 6. Ranking produk paling banyak terkirim
    best_sellers = sorted(
        [
            x for x in results
            if x["total_sold_period"] > 0
        ],
        key=lambda x: (
            -x["total_sold_period"], x["sku"]
        )
    )[:5]

    # 7. Produk dengan pengiriman paling rendah
    # Tidak otomatis berarti produk tidak laku
    if total_delivered > 0:
        low_movement = sorted(
            results,
            key=lambda x: (
                x["total_sold_period"], x["sku"]
            )
        )[:5]
    else:
        low_movement = []

    # 8. Produk yang perlu ditinjau untuk restock
    restock_candidates = [
        x for x in results
        if x["restock_recommendation"]
        == "Pertimbangkan restock"
    ]

    return ok({
        "period_days": days,
        "has_delivery_history": total_delivered > 0,
        "total_delivered_units": total_delivered,
        "best_sellers": best_sellers,
        "low_movement_products": low_movement,
        "restock_candidates": restock_candidates,
        "products": results,
        "note": (
            "Produk terlaris dihitung dari Delivery Done. "
            "Keuntungan adalah estimasi berdasarkan "
            "Invoice Posted dan standard cost saat ini. "
            "Retur ditampilkan terpisah (Credit Note "
            "sudah membalik revenue di ledger)."
        )
    })


@bp.get("/contacts/profitability")
@require("contacts.view")
def contacts_profitability():
    db = get_db()

    # Ambil semua customer aktif
    customers = db.execute("""
        SELECT code, name, opening_ar, credit_limit
        FROM customers
        WHERE active = 1
        ORDER BY code
    """).fetchall()

    # Penjualan hanya dari Invoice Posted
    # Dipisah dari retur supaya tidak double counting
    invoice_rows = db.execute("""
        SELECT
            so.customer_code AS customer_code,
            SUM(il.net_amount) AS invoiced_net_sales,
            SUM(
                il.quantity * p.standard_cost
            ) AS estimated_cogs
        FROM invoices i
        JOIN sales_orders so
            ON so.id = i.order_id
        JOIN invoice_lines il
            ON il.invoice_id = i.id
        JOIN products p
            ON p.sku = il.sku
        WHERE i.status = 'Posted'
        GROUP BY so.customer_code
    """).fetchall()

    invoice_by_customer = {
        r["customer_code"]: dict(r)
        for r in invoice_rows
    }

    # Piutang dari Invoice Posted yang belum lunas
    ar_rows = db.execute("""
        SELECT
            so.customer_code AS customer_code,
            COUNT(*) AS posted_invoice_count,
            SUM(
                i.total - i.paid_amount - i.credited_amount
            ) AS unpaid_invoice_ar
        FROM invoices i
        JOIN sales_orders so
            ON so.id = i.order_id
        WHERE i.status = 'Posted'
        GROUP BY so.customer_code
    """).fetchall()

    ar_by_customer = {
        r["customer_code"]: dict(r)
        for r in ar_rows
    }

    # Retur yang sudah Done
    return_rows = db.execute("""
        SELECT
            so.customer_code AS customer_code,
            r.quantity,
            r.credit_total,
            p.standard_cost
        FROM returns r
        JOIN invoices i
            ON i.id = r.invoice_id
        JOIN sales_orders so
            ON so.id = i.order_id
        JOIN products p
            ON p.sku = r.sku
        WHERE r.status = 'Done'
          AND i.status = 'Posted'
    """).fetchall()

    tax_setting = db.execute("""
        SELECT value
        FROM settings
        WHERE key = 'tax_effective_rate'
    """).fetchone()

    tax_rate = (
        float(tax_setting["value"])
        if tax_setting else 0.11
    )

    returns_by_customer = {}

    for r in return_rows:
        ret = returns_by_customer.setdefault(
            r["customer_code"],
            {
                "returned_units": 0,
                "returned_net_est": 0,
                "returned_cost_est": 0,
                "credit_note_gross": 0
            }
        )

        ret["returned_units"] += r["quantity"]

        # credit_total sudah termasuk pajak
        ret["returned_net_est"] += money(
            r["credit_total"] / (1 + tax_rate)
        )

        ret["returned_cost_est"] += (
            r["quantity"] * r["standard_cost"]
        )

        ret["credit_note_gross"] += r["credit_total"]

    results = []

    for c in customers:
        code = c["code"]

        invoice = invoice_by_customer.get(code)
        ar = ar_by_customer.get(code, {})
        ret = returns_by_customer.get(code, {})

        opening_ar = c["opening_ar"]

        unpaid_invoice_ar = ar.get(
            "unpaid_invoice_ar", 0
        )

        outstanding_ar = (
            opening_ar + unpaid_invoice_ar
        )

        # Jangan mengarang keuntungan jika
        # belum ada Invoice Posted
        if invoice is None:
            net_sales = None
            estimated_cogs = None
            gross_profit = None
            profit_margin_pct = None

            profit_status = (
                "Belum ada Invoice Posted"
            )

        else:
            # Penjualan bersih setelah retur
            net_sales = (
                invoice["invoiced_net_sales"]
                - ret.get("returned_net_est", 0)
            )

            # Estimasi COGS setelah retur
            estimated_cogs = (
                invoice["estimated_cogs"]
                - ret.get("returned_cost_est", 0)
            )

            gross_profit = (
                net_sales - estimated_cogs
            )

            profit_margin_pct = (
                round(
                    gross_profit / net_sales * 100,
                    2
                )
                if net_sales > 0 else None
            )

            if gross_profit > 0:
                profit_status = "Untung (estimasi)"

            elif gross_profit < 0:
                profit_status = "Rugi (estimasi)"

            else:
                profit_status = "Impas (estimasi)"

        results.append({
            "customer_code": code,
            "customer_name": c["name"],

            "posted_invoice_count": ar.get(
                "posted_invoice_count", 0
            ),

            "net_sales": net_sales,
            "estimated_cogs": estimated_cogs,
            "estimated_gross_profit": gross_profit,
            "estimated_margin_pct": profit_margin_pct,
            "profit_status": profit_status,

            "opening_ar": opening_ar,
            "unpaid_invoice_ar": unpaid_invoice_ar,
            "outstanding_ar": outstanding_ar,
            "credit_limit": c["credit_limit"],

            "returned_units": ret.get(
                "returned_units", 0
            ),

            "credit_note_gross": ret.get(
                "credit_note_gross", 0
            )
        })

    # Ranking customer paling menguntungkan
    profitable = sorted(
        [
            r for r in results
            if r["estimated_gross_profit"] is not None
            and r["estimated_gross_profit"] > 0
        ],
        key=lambda r: (
            -r["estimated_gross_profit"],
            r["customer_code"]
        )
    )

    # Customer dengan estimasi laba negatif
    losses = sorted(
        [
            r for r in results
            if r["estimated_gross_profit"] is not None
            and r["estimated_gross_profit"] < 0
        ],
        key=lambda r: (
            r["estimated_gross_profit"],
            r["customer_code"]
        )
    )

    customers_with_data = sum(
        r["posted_invoice_count"] > 0
        for r in results
    )

    return ok({
        "summary": {
            "customer_count": len(results),

            "customers_with_posted_invoice":
                customers_with_data,

            "customers_without_posted_invoice":
                len(results) - customers_with_data,

            "total_outstanding_ar": sum(
                r["outstanding_ar"]
                for r in results
            ),

            "total_estimated_gross_profit": (
                sum(
                    r["estimated_gross_profit"] or 0
                    for r in results
                )
                if customers_with_data else None
            )
        },

        "most_profitable": profitable[:5],
        "loss_making": losses,
        "customers": results,

        "note": (
            "Profit merupakan ESTIMASI kumulatif "
            "dari Invoice Posted dikurangi Return Done. "
            "COGS menggunakan standard cost saat ini, "
            "bukan biaya historis. "
            "Piutang = opening AR + sisa Invoice Posted. "
            "Credit Note mengurangi AR invoice terkait. "
            "Opening AR tidak dihitung sebagai laba."
        )
    })


# ================================================================ Master Admin, kontak, lot, laporan, dashboard per role
import re as _re

def _admin_log(target, change_type, detail):
    get_db().execute("INSERT INTO permission_changes(actor,target,change_type,detail) VALUES(?,?,?,?)",
                     (user(), target, change_type, detail))
    audit(user(), change_type, target, detail)


ROLE_CODE = _re.compile(r"^[A-Za-z][A-Za-z0-9_ -]{1,29}$")
USERNAME = _re.compile(r"^[a-z0-9_.]{3,30}$")


@bp.get("/admin/catalog")
@require("admin.roles")
def admin_catalog():
    return ok([{"permission": p, "module": m, "action": a, "label": l} for p, m, a, l in CATALOG])


@bp.get("/admin/users")
@require("admin.users")
def admin_users():
    return ok(rowdicts(get_db().execute(
        "SELECT id, username, full_name, email, phone, role, level, active, last_login, created_by, created_at FROM users ORDER BY id")))


def _valid_role(code):
    return one("SELECT 1 FROM roles WHERE code=?", (code,)) is not None


@bp.post("/admin/users")
@require("admin.users")
@tx
def admin_create_user():
    d = body()
    uname = str(d.get("username", "")).strip().lower()
    if not USERNAME.match(uname):
        return err("Username 3–30 karakter: huruf kecil, angka, titik atau underscore")
    if one("SELECT 1 FROM users WHERE username=?", (uname,)):
        return err(f"Username {uname} sudah dipakai", 409)
    if not d.get("full_name"):
        return err("Nama lengkap wajib diisi")
    if not _valid_role(d.get("role")):
        return err("Role tidak valid")
    pw = str(d.get("password", ""))
    if len(pw) < 6:
        return err("Password minimal 6 karakter")
    active = 1 if d.get("active", True) else 0
    lvl = d.get("level") or "Staff"
    if lvl not in ("Manager", "Staff"):
        return err("Level harus Manager atau Staff")
    cur = get_db().execute("INSERT INTO users(username,full_name,password_hash,role,email,phone,active,created_by,level) "
                           "VALUES(?,?,?,?,?,?,?,?,?)", (uname, d["full_name"], generate_password_hash(pw), d["role"],
                                                        d.get("email"), d.get("phone"), active, user(), lvl))
    _admin_log(uname, "Create user", f"role={d['role']} level={lvl} active={bool(active)}")
    return ok({"id": cur.lastrowid, "username": uname}, 201)


@bp.put("/admin/users/<int:uid>")
@require("admin.users")
@tx
def admin_edit_user(uid):
    u = one("SELECT * FROM users WHERE id=?", (uid,))
    if not u:
        return err("User tidak ditemukan", 404)
    d = body()
    changes = []
    for f in ("full_name", "email", "phone"):
        if f in d and (d[f] or None) != u[f]:
            changes.append(f"{f}: {u[f] or '—'} → {d[f] or '—'}")
    new_role = d.get("role", u["role"])
    new_level = d.get("level", u["level"]) or "Manager"
    if new_level not in ("Manager", "Staff"):
        return err("Level harus Manager atau Staff")
    if new_role != u["role"]:
        if not _valid_role(new_role):
            return err("Role tidak valid")
        if uid == session.get("user_id"):
            return err("Tidak dapat mengganti role akun sendiri", 409)
    db = get_db()
    db.execute("UPDATE users SET full_name=?, email=?, phone=?, role=?, level=? WHERE id=?",
               (d.get("full_name", u["full_name"]) or u["full_name"], d.get("email", u["email"]),
                d.get("phone", u["phone"]), new_role, new_level, uid))
    if new_level != u["level"]:
        _admin_log(u["username"], "Assign level", f"{u['level']} → {new_level}")
    if d.get("password"):
        if len(str(d["password"])) < 6:
            return err("Password minimal 6 karakter")
        db.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(str(d["password"])), uid))
        changes.append("password direset")
    if changes:
        audit(user(), "Edit user", u["username"], "; ".join(changes))
    if new_role != u["role"]:
        _admin_log(u["username"], "Assign role", f"{u['role']} → {new_role}")
    return ok({"id": uid})


@bp.post("/admin/users/<int:uid>/active")
@require("admin.users")
@tx
def admin_toggle_user(uid):
    u = one("SELECT * FROM users WHERE id=?", (uid,))
    if not u:
        return err("User tidak ditemukan", 404)
    active = 1 if body().get("active") else 0
    if uid == session.get("user_id") and not active:
        return err("Tidak dapat menonaktifkan akun sendiri", 409)
    get_db().execute("UPDATE users SET active=? WHERE id=?", (active, uid))
    _admin_log(u["username"], "Activate user" if active else "Deactivate user",
               "Akun diaktifkan" if active else "Akun dinonaktifkan; sesi aktif langsung berakhir")
    return ok({"active": bool(active)})


@bp.get("/admin/roles")
@require("admin.roles")
def admin_roles():
    out = []
    for r in get_db().execute("SELECT * FROM roles ORDER BY is_system DESC, code"):
        d = dict(r)
        d["permissions"] = permissions_for(r["code"])
        d["user_count"] = scalar("SELECT COUNT(*) FROM users WHERE role=?", (r["code"],))
        out.append(d)
    return ok(out)


@bp.post("/admin/roles")
@require("admin.roles")
@tx
def admin_create_role():
    d = body()
    code = str(d.get("code", "")).strip()
    if not ROLE_CODE.match(code):
        return err("Kode role 2–30 karakter, diawali huruf")
    if _valid_role(code):
        return err(f"Role {code} sudah ada", 409)
    db = get_db()
    db.execute("INSERT INTO roles(code,name,description,is_system,created_by) VALUES(?,?,?,0,?)",
               (code, d.get("name") or code, d.get("description"), user()))
    perms = permissions_for(d["copy_from"]) if d.get("copy_from") and _valid_role(d["copy_from"]) else ["dashboard.view"]
    for p in perms:
        db.execute("INSERT INTO role_permissions(role,permission) VALUES(?,?)", (code, p))
    _admin_log(code, "Create role", f"{len(perms)} permission" + (f" (salin dari {d['copy_from']})" if d.get("copy_from") else ""))
    return ok({"code": code}, 201)


@bp.put("/admin/roles/<code>")
@require("admin.roles")
@tx
def admin_edit_role(code):
    r = one("SELECT * FROM roles WHERE code=?", (code,))
    if not r:
        return err("Role tidak ditemukan", 404)
    d = body()
    get_db().execute("UPDATE roles SET name=?, description=? WHERE code=?",
                     (d.get("name") or r["name"], d.get("description", r["description"]), code))
    audit(user(), "Edit role", code, f"name={d.get('name') or r['name']}")
    return ok({"code": code})


@bp.put("/admin/roles/<code>/permissions")
@require("admin.roles")
@tx
def admin_set_permissions(code):
    if not _valid_role(code):
        return err("Role tidak ditemukan", 404)
    wanted = set(body().get("permissions") or [])
    unknown = wanted - set(ALL_PERMS)
    if unknown:
        return err(f"Permission tidak dikenal: {', '.join(sorted(unknown))}")
    wanted.add("dashboard.view")
    if code == "Admin" and not {"admin.users", "admin.roles"} <= wanted:
        return err("Role Admin wajib mempertahankan admin.users dan admin.roles agar sistem tetap bisa dikelola", 409)
    current = set(permissions_for(code))
    added, removed = sorted(wanted - current), sorted(current - wanted)
    db = get_db()
    for p in added:
        db.execute("INSERT INTO role_permissions(role,permission) VALUES(?,?)", (code, p))
    for p in removed:
        db.execute("DELETE FROM role_permissions WHERE role=? AND permission=?", (code, p))
    if added or removed:
        _admin_log(code, "Permission change", ("+ " + ", ".join(added) if added else "")
                   + (" | " if added and removed else "") + ("− " + ", ".join(removed) if removed else ""))
    return ok({"added": added, "removed": removed})


@bp.post("/admin/roles/<code>/reset")
@require("admin.roles")
@tx
def admin_reset_role(code):
    if code not in DEFAULT_PERMISSIONS:
        return err("Hanya role bawaan yang memiliki default", 409)
    db = get_db()
    db.execute("DELETE FROM role_permissions WHERE role=?", (code,))
    for p in sorted(DEFAULT_PERMISSIONS[code]):
        db.execute("INSERT INTO role_permissions(role,permission) VALUES(?,?)", (code, p))
    _admin_log(code, "Permission change", "Dikembalikan ke matriks akses default")
    return ok({"code": code})


@bp.delete("/admin/roles/<code>")
@require("admin.roles")
@tx
def admin_delete_role(code):
    r = one("SELECT * FROM roles WHERE code=?", (code,))
    if not r:
        return err("Role tidak ditemukan", 404)
    if r["is_system"]:
        return err("Role bawaan tidak dapat dihapus", 409)
    if scalar("SELECT COUNT(*) FROM users WHERE role=?", (code,)):
        return err("Masih ada user dengan role ini", 409)
    get_db().execute("DELETE FROM role_permissions WHERE role=?", (code,))
    get_db().execute("DELETE FROM roles WHERE code=?", (code,))
    _admin_log(code, "Delete role", "Role dihapus")
    return ok()


@bp.get("/admin/login-history")
@require("admin.logs")
def admin_login_history():
    return ok(rowdicts(get_db().execute("SELECT * FROM login_history ORDER BY id DESC LIMIT 300")))


@bp.get("/admin/permission-changes")
@require("admin.logs")
def admin_permission_changes():
    return ok(rowdicts(get_db().execute("SELECT * FROM permission_changes ORDER BY id DESC LIMIT 300")))


# ---------------------------------------------------------------- Contacts (F-02)
CUSTOMER_FIELDS = ("name", "type", "city", "contact_person", "phone", "email", "address")


@bp.post("/customers")
@require("customers.manage")
@tx
def create_customer():
    d = body()
    code = str(d.get("code", "")).strip().upper()
    if not code or not d.get("name"):
        return err("Kode dan nama customer wajib diisi")
    if one("SELECT 1 FROM customers WHERE code=?", (code,)):
        return err(f"Customer {code} sudah ada", 409)
    get_db().execute("INSERT INTO customers(code,name,type,city,contact_person,phone,email,address,credit_limit,payment_terms,"
                     "opening_ar,active) VALUES(?,?,?,?,?,?,?,?,0,'COD',0,1)",
                     (code, d["name"], d.get("type") or "Business", d.get("city"), d.get("contact_person"),
                      d.get("phone"), d.get("email"), d.get("address")))
    audit(user(), "Create customer", code, "Credit limit Rp0 & COD sampai Finance menetapkan terms")
    return ok({"code": code}, 201)


@bp.put("/customers/<code>")
@require("customers.manage")
@tx
def edit_customer(code):
    c = one("SELECT * FROM customers WHERE code=?", (code,))
    if not c:
        return err("Customer tidak ditemukan", 404)
    d = body()
    if "credit_limit" in d or "payment_terms" in d:
        return blocked("Blocked terms edit", code, f"{role()} mencoba mengubah credit terms",
                       "Credit limit dan payment terms hanya dapat diubah Finance (F-02).", 403)
    vals = [d.get(f, c[f]) for f in CUSTOMER_FIELDS]
    get_db().execute(f"UPDATE customers SET {', '.join(f + '=?' for f in CUSTOMER_FIELDS)} WHERE code=?", (*vals, code))
    audit(user(), "Edit customer", code, "; ".join(f"{f}={d[f]}" for f in CUSTOMER_FIELDS if f in d and d[f] != c[f]) or "—")
    return ok({"code": code})


@bp.put("/customers/<code>/terms")
@require("customers.credit")
@tx
def customer_terms(code):
    c = one("SELECT * FROM customers WHERE code=?", (code,))
    if not c:
        return err("Customer tidak ditemukan", 404)
    d = body()
    limit = as_int(d.get("credit_limit", c["credit_limit"]), "Credit limit")
    terms = str(d.get("payment_terms", c["payment_terms"])).upper()
    if limit < 0 or not _re.match(r"^(COD|NET\d{1,3})$", terms):
        return err("Credit limit ≥ 0 dan payment terms COD atau NETxx")
    get_db().execute("UPDATE customers SET credit_limit=?, payment_terms=? WHERE code=?", (limit, terms, code))
    audit(user(), "Update credit terms", code, f"Limit {idr(c['credit_limit'])} → {idr(limit)}; terms {c['payment_terms']} → {terms}")
    return ok({"code": code, "credit_limit": limit, "payment_terms": terms})


@bp.get("/customers/<code>/history")
@require("contacts.view")
def customer_history(code):
    db = get_db()
    return ok({"sales": rowdicts(db.execute("SELECT id, number, status, total, created_at FROM sales_orders WHERE customer_code=? "
                                            "ORDER BY id DESC", (code,))) if allowed("sales.view") else [],
               "invoices": rowdicts(db.execute("SELECT i.id, i.number, i.status, i.payment_status, i.total, "
                                               "i.total-i.paid_amount-i.credited_amount residual FROM invoices i JOIN sales_orders s "
                                               "ON s.id=i.order_id WHERE s.customer_code=? ORDER BY i.id DESC", (code,)))
               if allowed("invoicing.view") else []})


@bp.post("/vendors")
@require("vendors.manage")
@tx
def create_vendor():
    d = body()
    code = str(d.get("code", "")).strip().upper()
    if not code or not d.get("name"):
        return err("Kode dan nama vendor wajib diisi")
    if one("SELECT 1 FROM vendors WHERE code=?", (code,)):
        return err(f"Vendor {code} sudah ada", 409)
    get_db().execute("INSERT INTO vendors(code,name,city,payment_terms,tax_status,opening_ap,contact_person,phone,email) "
                     "VALUES(?,?,?,?,?,0,?,?,?)", (code, d["name"], d.get("city"), d.get("payment_terms") or "NET14",
                                                   d.get("tax_status") or "PKP", d.get("contact_person"), d.get("phone"),
                                                   d.get("email")))
    audit(user(), "Create vendor", code, d["name"])
    return ok({"code": code}, 201)


@bp.put("/vendors/<code>")
@require("vendors.manage")
@tx
def edit_vendor(code):
    v = one("SELECT * FROM vendors WHERE code=?", (code,))
    if not v:
        return err("Vendor tidak ditemukan", 404)
    d = body()
    fields = ("name", "city", "payment_terms", "tax_status", "contact_person", "phone", "email")
    get_db().execute(f"UPDATE vendors SET {', '.join(f + '=?' for f in fields)} WHERE code=?",
                     (*[d.get(f, v[f]) for f in fields], code))
    audit(user(), "Edit vendor", code, "; ".join(f"{f}={d[f]}" for f in fields if f in d and d[f] != v[f]) or "—")
    return ok({"code": code})


@bp.put("/vendors/<code>/pricelist")
@require("vendors.manage")
@tx
def vendor_price(code):
    d = body()
    if not one("SELECT 1 FROM vendors WHERE code=?", (code,)) or not one("SELECT 1 FROM products WHERE sku=?", (d.get("sku"),)):
        return err("Vendor/SKU tidak valid")
    price = as_int(d.get("purchase_price"), "Harga beli")
    if price <= 0:
        return err("Harga beli harus > 0")
    get_db().execute("INSERT INTO vendor_pricelist(vendor_code,sku,min_qty,purchase_price,currency) VALUES(?,?,1,?,'IDR') "
                     "ON CONFLICT(vendor_code,sku) DO UPDATE SET purchase_price=excluded.purchase_price", (code, d["sku"], price))
    audit(user(), "Update pricelist", code, f"{d['sku']} = {idr(price)}")
    return ok()


@bp.get("/vendors/<code>/history")
@require("purchase.view")
def vendor_history(code):
    return ok(rowdicts(get_db().execute("SELECT id, number, status, subtotal, total, expected_date, created_at FROM purchase_orders "
                                        "WHERE vendor_code=? ORDER BY id DESC", (code,))))


# ---------------------------------------------------------------- Warehouses
@bp.post("/warehouses")
@require("warehouses.manage")
@tx
def create_warehouse():
    d = body()
    code = str(d.get("code", "")).strip().upper()
    if not _re.match(r"^[A-Z0-9-]{2,12}$", code) or not d.get("name"):
        return err("Kode (2–12 huruf/angka/-) dan nama lokasi wajib diisi")
    if one("SELECT 1 FROM warehouses WHERE code=?", (code,)):
        return err(f"Lokasi {code} sudah ada", 409)
    db = get_db()
    db.execute("INSERT INTO warehouses(code,name,city,type) VALUES(?,?,?,?)", (code, d["name"], d.get("city"),
                                                                             d.get("type") or "Internal Warehouse"))
    for p in db.execute("SELECT sku FROM products").fetchall():
        db.execute("INSERT OR IGNORE INTO stock(sku,warehouse_code,on_hand) VALUES(?,?,0)", (p["sku"], code))
    audit(user(), "Create warehouse", code, d["name"])
    return ok({"code": code}, 201)


# ---------------------------------------------------------------- CRM activity
@bp.post("/leads/<int:lid>/activity")
@require("crm.create")
@tx
def lead_activity(lid):
    lead = one("SELECT * FROM leads WHERE id=?", (lid,))
    if not lead:
        return err("Lead tidak ditemukan", 404)
    d = body()
    typ = d.get("activity_type") or "Note"
    if typ not in ("Call", "Meeting", "Email", "Visit", "Note") or not (d.get("summary") or "").strip():
        return err("Jenis aktivitas & ringkasan wajib diisi")
    get_db().execute("INSERT INTO lead_activities(lead_id,activity_type,summary,actor) VALUES(?,?,?,?)",
                     (lid, typ, d["summary"].strip(), user()))
    audit(user(), f"Activity: {typ}", lead["number"], d["summary"].strip())
    return ok(status=201)


# ---------------------------------------------------------------- Lot & Expiry (F-23)
def _expiry_status(exp, remaining, status):
    if status == "Hold":
        return "Hold", None
    if not exp:
        return "Tanpa expiry", None
    days = (date.fromisoformat(exp) - now_wib().date()).days
    if remaining <= 0:
        return "Habis", days
    return ("Expired" if days < 0 else "Near expiry" if days <= 30 else "OK"), days


@bp.get("/lots")
@require("lots.view")
def lots():
    rows = rowdicts(get_db().execute(
        "SELECT l.*, p.name product, r.number receipt FROM lots l JOIN products p ON p.sku=l.sku "
        "LEFT JOIN receipts r ON r.id=l.receipt_id ORDER BY COALESCE(l.expiry_date,'9999'), l.id"))
    for r in rows:
        r["expiry_status"], r["days_to_expiry"] = _expiry_status(r["expiry_date"], r["remaining_qty"], r["status"])
    return ok(rows)


@bp.post("/lots/<int:lot_id>/inspect")
@require("lots.inspect")
@tx
def inspect_lot(lot_id):
    lot = one("SELECT * FROM lots WHERE id=?", (lot_id,))
    if not lot:
        return err("Lot tidak ditemukan", 404)
    d = body()
    status = d.get("status")
    note = (d.get("note") or "").strip()
    if status not in ("Released", "Hold") or not note:
        return err("Status Released/Hold dan catatan inspeksi wajib diisi")
    get_db().execute("UPDATE lots SET status=?, inspection_note=?, inspected_by=? WHERE id=?", (status, note, user(), lot_id))
    audit(user(), "Lot inspection", lot["lot_number"], f"{lot['status']} → {status}: {note}")
    return ok({"status": status})


# ---------------------------------------------------------------- Tax (F-21)
@bp.put("/settings/tax")
@require("tax.manage")
@tx
def update_tax():
    d = body()
    nominal = str(d.get("nominal_rate", setting("tax_nominal_rate"))).replace("%", "").strip()
    factor = str(d.get("tax_base_factor", setting("tax_base_factor"))).strip()
    try:
        n = Fraction(nominal)
        f = Fraction(factor)
    except (ValueError, ZeroDivisionError):
        return err("Format tarif/faktor tidak valid (contoh 12 dan 11/12)")
    if not (0 <= n <= 100 and 0 < f <= 1):
        return err("Tarif 0–100% dan faktor DPP 0–1")
    old = f"{setting('tax_nominal_rate')}% × {setting('tax_base_factor')}"
    db = get_db()
    db.execute("UPDATE settings SET value=? WHERE key='tax_nominal_rate'", (nominal,))
    db.execute("UPDATE settings SET value=? WHERE key='tax_base_factor'", (factor,))
    db.execute("UPDATE settings SET value=? WHERE key='tax_effective_rate'", (str(float(n * f / 100)),))
    audit(user(), "Update tax setting", "VAT11", f"{old} → {nominal}% × {factor}; berlaku untuk dokumen baru")
    return ok({"effective_rate": f"{float(n * f):.2f}%"})


# ---------------------------------------------------------------- Audit trail per scope (F-20)
FIN_REFS = ("INV/%", "BILL/%", "PAY/%", "RINV/%", "MISC%")
QC_REFS = ("QC%", "WH/IN/%", "WH/RET/%")


@bp.get("/audit")
@require("dashboard.view")
def audit_scoped():
    if allowed("audit.view"):
        return ok({"scope": "Seluruh aktivitas", "rows": rowdicts(get_db().execute("SELECT * FROM audit_logs ORDER BY id DESC"))})
    conds, args, scope = ["actor=?"], [user()], ["aktivitas sendiri"]
    if level() == "Manager":
        team = [r["username"] for r in get_db().execute("SELECT username FROM users WHERE role=?", (role(),))]
        conds.append("actor IN (%s)" % ",".join("?" * len(team)))
        args += team
        scope[0] = f"aktivitas tim {role()}"
    if allowed("audit.financial"):
        conds += ["document_ref LIKE ?"] * len(FIN_REFS)
        args += FIN_REFS
        scope.append("aktivitas keuangan")
    if allowed("audit.quality"):
        conds += ["document_ref LIKE ?"] * len(QC_REFS) + ["action LIKE '%Quality%'", "action LIKE '%inspection%'"]
        args += QC_REFS
        scope.append("aktivitas QC")
    rows = get_db().execute(f"SELECT * FROM audit_logs WHERE {' OR '.join(conds)} ORDER BY id DESC", args)
    return ok({"scope": ", ".join(scope).capitalize(), "rows": rowdicts(rows)})


# ---------------------------------------------------------------- Financial reports (P&L, Balance Sheet)
@bp.get("/accounting/financial-reports")
@require("accounting.view")
def financial_reports():
    bal = {r["code"]: dict(r) for r in get_db().execute(
        "SELECT a.code, a.name, a.type, COALESCE(SUM(jl.debit-jl.credit),0) bal FROM accounts a LEFT JOIN journal_lines jl "
        "ON jl.account_code=a.code GROUP BY a.code ORDER BY a.code")}
    b = lambda c: bal[c]["bal"] if c in bal else 0
    revenue = -b("4100")
    discounts = b("4110")
    net_sales = revenue - discounts
    cogs = b("5100")
    gross = net_sales - cogs
    expenses = [[bal[c]["name"], b(c)] for c in ("6100", "6200", "6300") if c in bal]
    net_income = gross - sum(x[1] for x in expenses)
    assets = [[f"{c} {v['name']}", v["bal"]] for c, v in bal.items() if v["type"] == "Asset"]
    liabilities = [[f"{c} {v['name']}", -v["bal"]] for c, v in bal.items() if v["type"] == "Liability"]
    equity = [[f"{c} {v['name']}", -v["bal"]] for c, v in bal.items() if v["type"] == "Equity"] + [["Laba berjalan", net_income]]
    ta, tl, te = sum(x[1] for x in assets), sum(x[1] for x in liabilities), sum(x[1] for x in equity)
    return ok({"profit_loss": [["Sales Revenue", revenue], ["Sales Discounts", -discounts], ["Net Sales", net_sales],
                               ["Cost of Goods Sold", -cogs], ["Gross Profit", gross]]
               + [[n, -v] for n, v in expenses] + [["Net Income", net_income]],
               "assets": assets, "liabilities": liabilities, "equity": equity,
               "total_assets": ta, "total_liabilities_equity": tl + te, "balanced": ta == tl + te})


# ---------------------------------------------------------------- Dashboard per role (F-19)
def K(label, value, hint="", link=None, kind="num"):
    return {"label": label, "value": value, "hint": hint, "link": link, "kind": kind}


def T(title, rows, link=None, columns=None, kind="table"):
    return {"title": title, "type": kind, "rows": rows, "link": link, "columns": columns}


def low_stock_rows():
    rows = rowdicts(get_db().execute(
        "SELECT s.sku, p.name, s.warehouse_code, s.on_hand, COALESCE((SELECT SUM(quantity) FROM reservations r WHERE r.sku=s.sku "
        "AND r.warehouse_code=s.warehouse_code AND r.active=1),0) reserved, rp.min_available FROM stock s "
        "JOIN products p ON p.sku=s.sku LEFT JOIN reorder_points rp ON rp.sku=s.sku AND rp.warehouse_code=s.warehouse_code"))
    out = []
    for r in rows:
        r["available"] = r["on_hand"] - r["reserved"]
        minimum = r["min_available"] if r["min_available"] is not None else 10
        if r["available"] <= minimum:
            out.append({"sku": r["sku"], "name": r["name"], "warehouse_code": r["warehouse_code"], "available": r["available"],
                        "minimum": minimum, "basis": "Reorder point" if r["min_available"] is not None else "Default 10"})
    return sorted(out, key=lambda x: x["available"] - x["minimum"])


def terms_days(t):
    m = _re.match(r"NET(\d+)", t or "")
    return int(m.group(1)) if m else 0


def open_invoice_rows():
    rows = []
    today = now_wib().date()
    for i in get_db().execute(
            "SELECT i.id, i.number, c.code customer_code, c.name customer, c.payment_terms, i.total, i.paid_amount, i.credited_amount, "
            "i.payment_status, i.posted_at FROM invoices i JOIN sales_orders s ON s.id=i.order_id JOIN customers c ON "
            "c.code=s.customer_code WHERE i.status='Posted' ORDER BY i.id DESC"):
        residual = i["total"] - i["paid_amount"] - i["credited_amount"]
        due = (date.fromisoformat(i["posted_at"][:10]) + timedelta(days=terms_days(i["payment_terms"]))) if i["posted_at"] else today
        rows.append({"id": i["id"], "number": i["number"], "customer": f"{i['customer_code']} {i['customer']}",
                     "total": i["total"], "residual": residual, "payment_status": i["payment_status"],
                     "due_date": due.isoformat(), "overdue_days": max(0, (today - due).days) if residual > 0 else 0})
    return rows


def dash_admin():
    db = get_db()
    total = scalar("SELECT COUNT(*) FROM users")
    active = scalar("SELECT COUNT(*) FROM users WHERE active=1")
    return {"title": "Master Admin Dashboard", "focus": "Mengelola akun, role, dan hak akses sistem.",
            "kpis": [K("Total Users", total, "Seluruh akun", "admin/users"), K("Total Roles", scalar("SELECT COUNT(*) FROM roles"), "Bawaan + custom", "admin/roles"),
                     K("Active Users", active, "Dapat login", "admin/users"), K("Inactive Users", total - active, "Login diblokir", "admin/users")],
            "sections": [
                T("Recent User Activity", rowdicts(db.execute("SELECT created_at, actor, action, document_ref FROM audit_logs ORDER BY id DESC LIMIT 8")), "reporting/audit"),
                T("Login History", rowdicts(db.execute("SELECT created_at, username, CASE success WHEN 1 THEN 'Success' ELSE 'Failed' END status, note "
                                                        "FROM login_history ORDER BY id DESC LIMIT 8")), "admin/logins"),
                T("Recently Created Accounts", rowdicts(db.execute("SELECT username, full_name, role, created_by, created_at FROM users ORDER BY id DESC LIMIT 5")), "admin/users"),
                T("Role Distribution", [{"label": r["role"], "value": r["n"]} for r in db.execute(
                    "SELECT role, COUNT(*) n FROM users GROUP BY role ORDER BY n DESC")], "admin/roles", kind="bars"),
                T("Permission Changes", rowdicts(db.execute("SELECT created_at, actor, target, change_type, detail FROM permission_changes ORDER BY id DESC LIMIT 6")), "admin/permlog"),
                T("Pending Account Activation", rowdicts(db.execute("SELECT username, full_name, role, created_at FROM users WHERE active=0")), "admin/users"),
            ]}


def dash_owner():
    db = get_db()
    revenue = -(account_balance("4100", True) + account_balance("4110", True))
    purchase = scalar("SELECT COALESCE(SUM(net_amount),0) FROM vendor_bills WHERE status='Posted'")
    sos = db.execute("SELECT so.*, c.name customer FROM sales_orders so JOIN customers c ON c.code=so.customer_code ORDER BY so.id DESC").fetchall()
    pos = db.execute("SELECT po.*, v.name vendor FROM purchase_orders po JOIN vendors v ON v.code=po.vendor_code ORDER BY po.id DESC").fetchall()
    perf = [{"label": r["customer"], "value": r["v"]} for r in db.execute(
        "SELECT c.name customer, SUM(i.net_amount) v FROM invoices i JOIN sales_orders s ON s.id=i.order_id JOIN customers c ON "
        "c.code=s.customer_code WHERE i.status='Posted' GROUP BY c.code ORDER BY v DESC")]
    pending = [{"type": "Diskon SO", "id": s["id"], "kind": "sale", "number": s["number"], "party": s["customer"], "amount": s["total"]}
               for s in sos if s["status"] == "Pending Approval"] + \
              [{"type": "PO > Rp1 jt", "id": p["id"], "kind": "purchase", "number": p["number"], "party": p["vendor"], "amount": p["subtotal"]}
               for p in pos if p["status"] == "Pending Approval"]
    return {"title": "Owner Dashboard", "focus": "Memantau keseluruhan performa bisnis dan melakukan approval.",
            "kpis": [K("Total Sales", revenue, "Revenue dari invoice Posted (bukan SO)", "accounting/trialbalance/4100", "money"),
                     K("Total Purchase", purchase, "Vendor bill Posted (net)", "accounting/bills", "money"),
                     K("Inventory Value", scalar("SELECT COALESCE(SUM(s.on_hand*p.standard_cost),0) FROM stock s JOIN products p ON p.sku=s.sku"),
                       "Standard cost", "inventory/stock", "money"),
                     K("Outstanding AR", account_balance("1100"), "Akun 1100", "accounting/trialbalance/1100", "money")],
            "sections": [
                T("Sales Performance (invoice posted per customer)", perf, "invoicing/invoices", kind="bars"),
                T("Pending Approvals", pending, None, ["type", "number", "party", "amount"], kind="docs"),
                T("Purchase Overview", rowdicts(db.execute("SELECT status, COUNT(*) count, SUM(subtotal) subtotal FROM purchase_orders GROUP BY status")), "purchase/purchase"),
                T("Inventory Overview", rowdicts(db.execute(
                    "SELECT s.warehouse_code, SUM(s.on_hand) on_hand, COALESCE((SELECT SUM(quantity) FROM reservations r WHERE r.warehouse_code=s.warehouse_code AND r.active=1),0) reserved, "
                    "SUM(s.on_hand)-COALESCE((SELECT SUM(quantity) FROM reservations r WHERE r.warehouse_code=s.warehouse_code AND r.active=1),0) available "
                    "FROM stock s GROUP BY s.warehouse_code")), "inventory/stock"),
                T("Open Sales Orders", [{"id": s["id"], "kind": "sale", "number": s["number"], "customer": s["customer"], "status": s["status"], "total": s["total"]}
                                        for s in sos if so_open(s)], None, ["number", "customer", "status", "total"], kind="docs"),
                T("Open Purchase Orders", [{"id": p["id"], "kind": "purchase", "number": p["number"], "vendor": p["vendor"], "status": p["status"], "subtotal": p["subtotal"]}
                                           for p in pos if po_open(p)], None, ["number", "vendor", "status", "subtotal"], kind="docs"),
                T("Posted Invoices", [dict(r, kind="invoice") for r in rowdicts(db.execute(
                    "SELECT i.id, i.number, c.name customer, i.total, i.payment_status FROM invoices i JOIN sales_orders s ON s.id=i.order_id "
                    "JOIN customers c ON c.code=s.customer_code WHERE i.status='Posted' ORDER BY i.id DESC LIMIT 8"))], None,
                  ["number", "customer", "total", "payment_status"], kind="docs"),
                T("Recent Business Activities", rowdicts(db.execute("SELECT created_at, actor, action, document_ref FROM audit_logs WHERE action NOT IN "
                                                                    "('Login','Logout','Login failed') ORDER BY id DESC LIMIT 8")), "reporting/audit"),
            ]}


def dash_sales():
    db = get_db()
    stage = {r["stage"]: r["n"] for r in db.execute("SELECT stage, COUNT(*) n FROM leads GROUP BY stage")}
    sos = db.execute("SELECT so.*, c.name customer FROM sales_orders so JOIN customers c ON c.code=so.customer_code ORDER BY so.id DESC").fetchall()
    waiting = []
    for s in sos:
        if s["status"] == "Confirmed":
            back = sum(l["remaining_qty"] for l in so_lines_status(s))
            if back:
                waiting.append({"id": s["id"], "kind": "sale", "number": s["number"], "customer": s["customer"], "remaining_qty": back})
    warn = []
    for c in db.execute("SELECT code FROM customers"):
        ci = credit_info(c["code"])
        if ci["credit_limit"] and ci["exposure"] >= 0.8 * ci["credit_limit"]:
            warn.append({"customer": f"{c['code']} {ci['customer_name']}", "exposure": ci["exposure"], "credit_limit": ci["credit_limit"],
                         "headroom": ci["headroom"]})
    top = [{"label": r["name"], "value": r["v"]} for r in db.execute(
        "SELECT c.name, SUM(so.total) v FROM sales_orders so JOIN customers c ON c.code=so.customer_code WHERE so.status='Confirmed' "
        "GROUP BY c.code ORDER BY v DESC LIMIT 5")]
    return {"title": "Sales Dashboard", "focus": "Mengelola pelanggan, peluang penjualan, quotation, dan sales order.",
            "kpis": [K("Total Leads", sum(stage.values()), "Seluruh lead/opportunity", "crm/pipeline"),
                     K("Open Opportunities", sum(v for k, v in stage.items() if k not in ("Won", "Lost")), "Belum Won/Lost", "crm/pipeline"),
                     K("Pending Quotations", sum(1 for s in sos if s["status"] in ("Quotation", "Pending Approval")), "Quotation + menunggu approval", "sales/quotations"),
                     K("Confirmed Sales Orders", sum(1 for s in sos if s["status"] == "Confirmed"), "Stok sudah direservasi", "sales/quotations")],
            "sections": [
                T("CRM Pipeline (Lead → Opportunity → Quotation → SO)", [{"label": s, "value": stage.get(s, 0)} for s in
                                                                        ("New", "Qualified", "Proposition", "Won", "Lost")], "crm/pipeline", kind="bars"),
                T("Sales Order Status", rowdicts(db.execute("SELECT status, COUNT(*) count, SUM(total) total FROM sales_orders GROUP BY status")), "sales/quotations"),
                T("Sales Performance / Top Customers (SO Confirmed)", top, "sales/quotations", kind="bars"),
                T("Pending Customer Approvals", [{"id": s["id"], "kind": "sale", "number": s["number"], "customer": s["customer"],
                                                  "discount_pct": s["discount_pct"], "total": s["total"]} for s in sos if s["status"] == "Pending Approval"],
                  None, ["number", "customer", "discount_pct", "total"], kind="docs"),
                T("Orders Waiting for Delivery", waiting, None, ["number", "customer", "remaining_qty"], kind="docs"),
                T("Customer Credit Limit Warning (≥ 80% limit)", warn, "sales/customers"),
                T("Product Availability", rowdicts(db.execute(
                    "SELECT s.sku, p.name, SUM(s.on_hand) on_hand, SUM(s.on_hand)-COALESCE((SELECT SUM(quantity) FROM reservations r WHERE r.sku=s.sku AND r.active=1),0) available "
                    "FROM stock s JOIN products p ON p.sku=s.sku GROUP BY s.sku ORDER BY available")), "sales/stock"),
            ]}


def dash_warehouse():
    db = get_db()
    oh = scalar("SELECT COALESCE(SUM(on_hand),0) FROM stock")
    rs = scalar("SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE active=1")
    back = []
    for s in db.execute("SELECT so.*, c.name customer FROM sales_orders so JOIN customers c ON c.code=so.customer_code WHERE so.status='Confirmed'").fetchall():
        for l in so_lines_status(s):
            if l["delivered_qty"] and l["remaining_qty"]:
                back.append({"id": s["id"], "kind": "sale", "number": s["number"], "sku": l["sku"], "delivered_qty": l["delivered_qty"], "backorder_qty": l["remaining_qty"]})
    return {"title": "Warehouse Dashboard", "focus": "Mengontrol persediaan, penerimaan barang, pengiriman, dan perpindahan stok.",
            "kpis": [K("Total On Hand", oh, "Stok fisik semua lokasi", "inventory/stock"), K("Reserved Stock", rs, "Dialokasikan ke SO", "inventory/stock"),
                     K("Available Stock", oh - rs, "On Hand − Reserved", "inventory/stock"),
                     K("Pending Deliveries", scalar("SELECT COUNT(*) FROM deliveries WHERE status='Ready'"), "Delivery Ready", "inventory/deliveries")],
            "sections": [
                T("Incoming Receipts", [dict(r, kind="receipt") for r in rowdicts(db.execute(
                    "SELECT r.id, r.number, po.number purchase_order, r.status FROM receipts r JOIN purchase_orders po ON po.id=r.purchase_order_id "
                    "WHERE r.status<>'Done' ORDER BY r.id DESC"))], None, ["number", "purchase_order", "status"], kind="docs"),
                T("Outgoing Deliveries", [dict(r, kind="delivery") for r in rowdicts(db.execute(
                    "SELECT d.id, d.number, so.number sales_order, d.status FROM deliveries d JOIN sales_orders so ON so.id=d.order_id "
                    "WHERE d.status='Ready' ORDER BY d.id DESC"))], None, ["number", "sales_order", "status"], kind="docs"),
                T("Partial Deliveries / Backorders", back, None, ["number", "sku", "delivered_qty", "backorder_qty"], kind="docs"),
                T("Internal Transfers", [dict(r, kind="transfer") for r in rowdicts(db.execute(
                    "SELECT id, number, sku, quantity, from_warehouse, to_warehouse, status FROM transfers ORDER BY id DESC LIMIT 6"))], None,
                  ["number", "sku", "quantity", "from_warehouse", "to_warehouse", "status"], kind="docs"),
                T("Return Stock Movements", [dict(r, kind="return") for r in rowdicts(db.execute(
                    "SELECT id, number, sku, quantity, inspection, status FROM returns ORDER BY id DESC LIMIT 6"))], None,
                  ["number", "sku", "quantity", "inspection", "status"], kind="docs"),
                T("Low Stock Alerts", low_stock_rows(), "inventory/stock"),
                T("Recent Stock Movements", rowdicts(db.execute("SELECT created_at, reference, move_type, sku, from_location, to_location, quantity "
                                                                "FROM stock_moves ORDER BY id DESC LIMIT 8")), "inventory/moves"),
            ]}


def dash_procurement():
    db = get_db()
    pos = db.execute("SELECT po.*, v.name vendor FROM purchase_orders po JOIN vendors v ON v.code=po.vendor_code ORDER BY po.id DESC").fetchall()
    waiting = []
    for p in pos:
        if p["status"] == "Confirmed" and po_open(p):
            remaining = sum(l["quantity"] - l["received_qty"] for l in doc_purchase(p["id"])["lines"]["rows"])
            waiting.append({"id": p["id"], "kind": "purchase", "number": p["number"], "vendor": p["vendor"], "expected_date": p["expected_date"], "remaining_qty": remaining})
    return {"title": "Procurement Dashboard", "focus": "Mengelola vendor, permintaan pembelian, dan purchase order.",
            "kpis": [K("Total RFQs", len(pos), "Seluruh RFQ/PO dibuat", "purchase/purchase"),
                     K("Open Purchase Orders", sum(1 for p in pos if po_open(p)), "Belum diterima penuh", "purchase/purchase"),
                     K("Pending Approvals", sum(1 for p in pos if p["status"] == "Pending Approval"), "Menunggu Owner", "purchase/purchase"),
                     K("Waiting for Receipt", len(waiting), "Confirmed, barang belum lengkap", "purchase/purchase")],
            "sections": [
                T("Purchase Order Status", [{"label": r["status"], "value": r["n"]} for r in db.execute(
                    "SELECT status, COUNT(*) n FROM purchase_orders GROUP BY status")], "purchase/purchase", kind="bars"),
                T("RFQ Status", [{"id": p["id"], "kind": "purchase", "number": p["number"], "vendor": p["vendor"], "status": p["status"], "subtotal": p["subtotal"]}
                                 for p in pos if p["status"] in ("RFQ", "Pending Approval")], None, ["number", "vendor", "status", "subtotal"], kind="docs"),
                T("Incoming Purchase Schedule", waiting, None, ["number", "vendor", "expected_date", "remaining_qty"], kind="docs"),
                T("Products to Reorder", low_stock_rows(), "purchase/products"),
                T("Purchase Order Approval Status", rowdicts(db.execute(
                    "SELECT number, subtotal, status, COALESCE(approved_by,'—') approved_by, approved_at FROM purchase_orders "
                    "WHERE subtotal > ? ORDER BY id DESC", (int(setting("large_po_threshold", "1000000")),))), "purchase/purchase"),
                T("Vendor Bill Matching Status", [dict(r, kind="bill") for r in rowdicts(db.execute(
                    "SELECT b.id, b.number, po.number purchase_order, b.match_status, b.status FROM vendor_bills b JOIN purchase_orders po ON po.id=b.purchase_order_id ORDER BY b.id DESC"))]
                  if allowed("bills.view") else [], None, ["number", "purchase_order", "match_status", "status"], kind="docs"),
                T("Vendor List", rowdicts(db.execute("SELECT v.code, v.name, v.payment_terms, COUNT(po.id) po_count, COALESCE(SUM(po.subtotal),0) po_subtotal "
                                                     "FROM vendors v LEFT JOIN purchase_orders po ON po.vendor_code=v.code GROUP BY v.code")), "purchase/vendors"),
                T("Recent Purchase Activities", rowdicts(db.execute("SELECT created_at, actor, action, document_ref FROM audit_logs WHERE document_ref LIKE 'PO%' "
                                                                    "OR document_ref LIKE 'WH/IN/%' ORDER BY id DESC LIMIT 8")), None),
            ]}


def dash_finance():
    db = get_db()
    inv = open_invoice_rows()
    bills = rowdicts(db.execute("SELECT b.id, b.number, po.vendor_code vendor, b.total, b.total-b.paid_amount residual, b.payment_status "
                                "FROM vendor_bills b JOIN purchase_orders po ON po.id=b.purchase_order_id WHERE b.status='Posted' ORDER BY b.id DESC"))
    revenue = -account_balance("4100")
    disc = account_balance("4110")
    cogs = account_balance("5100")
    stock_value = scalar("SELECT COALESCE(SUM(s.on_hand*p.standard_cost),0) FROM stock s JOIN products p ON p.sku=s.sku")
    exposures = []
    for c in db.execute("SELECT code FROM customers"):
        ci = credit_info(c["code"])
        exposures.append({"customer": f"{c['code']} {ci['customer_name']}", "credit_limit": ci["credit_limit"], "exposure": ci["exposure"], "headroom": ci["headroom"]})
    tb = trial_balance()[0].get_json()
    return {"title": "Finance Dashboard", "focus": "Mengelola invoice, pembayaran, piutang, utang, dan laporan keuangan.",
            "kpis": [K("Accounts Receivable", account_balance("1100"), "Opening + invoice − payment − credit note", "accounting/trialbalance/1100", "money"),
                     K("Accounts Payable", -account_balance("2100"), "Opening + bill − payment", "accounting/trialbalance/2100", "money"),
                     K("Unpaid Customer Invoices", sum(1 for i in inv if i["residual"] > 0), "Posted, belum lunas", "invoicing/invoices"),
                     K("Unpaid Vendor Bills", sum(1 for b in bills if b["residual"] > 0), "Posted, belum lunas", "accounting/bills")],
            "sections": [
                T("Revenue Overview", [{"item": "Sales revenue", "amount": revenue}, {"item": "Sales discounts", "amount": -disc},
                                       {"item": "COGS", "amount": -cogs}, {"item": "Gross profit", "amount": revenue - disc - cogs}], "accounting/reports"),
                T("Customer Payment Status", [dict(i, kind="invoice") for i in inv], None, ["number", "customer", "total", "residual", "payment_status", "due_date"], kind="docs"),
                T("Vendor Payment Status", [dict(b, kind="bill") for b in bills], None, ["number", "vendor", "total", "residual", "payment_status"], kind="docs"),
                T("Overdue Invoices", [dict(i, kind="invoice") for i in inv if i["overdue_days"] > 0], None,
                  ["number", "customer", "residual", "due_date", "overdue_days"], kind="docs"),
                T("Partial Payments", [dict(i, kind="invoice") for i in inv if i["payment_status"] == "Partial"]
                  + [dict(b, kind="bill") for b in bills if b["payment_status"] == "Partial"], None, ["number", "total", "residual", "payment_status"], kind="docs"),
                T("Credit Exposure", exposures, "invoicing/customers"),
                T("Journal Entries", [dict(r, kind="journal") for r in rowdicts(db.execute(
                    "SELECT j.id, j.number, j.reference, j.source_type, (SELECT SUM(debit) FROM journal_lines WHERE journal_id=j.id) debit "
                    "FROM journal_entries j ORDER BY j.id DESC LIMIT 6"))], None, ["number", "reference", "source_type", "debit"], kind="docs"),
                T("General Ledger Summary", [{"account": f"{l['account_code']} {l['account_name']}", "balance": l["balance"]} for l in tb["lines"] if l["debit"] or l["credit"]],
                  "accounting/trialbalance"),
                T("Tax Summary", [{"item": "VAT Output (2200)", "amount": -account_balance("2200")}, {"item": "VAT Input (1300)", "amount": account_balance("1300")},
                                  {"item": "PPN kurang bayar (simulasi)", "amount": -account_balance("2200") - account_balance("1300")}], "accounting/tax"),
                T("COGS and Inventory Valuation", [{"item": "COGS (5100)", "amount": cogs}, {"item": "Inventory ledger (1200)", "amount": account_balance("1200")},
                                                   {"item": "Stock valuation (standard cost)", "amount": stock_value},
                                                   {"item": "Selisih ledger vs stok", "amount": account_balance("1200") - stock_value}], "inventory/stock"),
            ]}


def dash_quality():
    db = get_db()
    insp = scalar("SELECT COALESCE(SUM(rl.received_qty),0) FROM receipt_lines rl JOIN receipts r ON r.id=rl.receipt_id WHERE r.qc_number IS NOT NULL")
    passed = scalar("SELECT COALESCE(SUM(rl.accepted_qty),0) FROM receipt_lines rl JOIN receipts r ON r.id=rl.receipt_id WHERE r.qc_number IS NOT NULL")
    lots_rows = lots()[0].get_json() if allowed("lots.view") else []
    return {"title": "Quality Dashboard", "focus": "Memastikan hanya barang lolos inspeksi yang masuk stok layak jual.",
            "kpis": [K("Waiting Inspection", scalar("SELECT COUNT(*) FROM receipts WHERE status='Waiting'"), "Receipt belum QC", "quality/quality"),
                     K("Inspected Units", insp, "Total unit diperiksa", "quality/quality"),
                     K("Pass Rate", f"{round(passed / insp * 100, 1) if insp else 0}%", f"Pass {passed} / Fail {insp - passed}", "quality/quality", "text"),
                     K("Returns to Inspect", scalar("SELECT COUNT(*) FROM returns WHERE status='Requested'"), "Return inspection", "quality/returns")],
            "sections": [
                T("Incoming Inspection Queue", [dict(r, kind="receipt") for r in rowdicts(db.execute(
                    "SELECT r.id, r.number, po.number purchase_order, (SELECT SUM(received_qty) FROM receipt_lines WHERE receipt_id=r.id) received "
                    "FROM receipts r JOIN purchase_orders po ON po.id=r.purchase_order_id WHERE r.status='Waiting'"))], None, ["number", "purchase_order", "received"], kind="docs"),
                T("Returns Awaiting Inspection", [dict(r, kind="return") for r in rowdicts(db.execute(
                    "SELECT id, number, sku, quantity, reason FROM returns WHERE status='Requested'"))], None, ["number", "sku", "quantity", "reason"], kind="docs"),
                T("Lots on Hold / Near Expiry", [x for x in lots_rows if x["expiry_status"] in ("Hold", "Near expiry", "Expired")], "quality/lots",
                  ["lot_number", "sku", "expiry_date", "remaining_qty", "expiry_status"]),
                T("Inspection History", rowdicts(db.execute(
                    "SELECT r.qc_at, r.qc_number, r.number receipt, rl.sku, rl.accepted_qty passed, rl.rejected_qty failed, rl.quality_reason "
                    "FROM receipt_lines rl JOIN receipts r ON r.id=rl.receipt_id WHERE r.qc_number IS NOT NULL ORDER BY r.qc_at DESC LIMIT 10")), "quality/quality"),
            ]}


DASH = {"Admin": dash_admin, "Owner": dash_owner, "Sales": dash_sales, "Warehouse": dash_warehouse,
        "Procurement": dash_procurement, "Finance": dash_finance, "Quality": dash_quality}
DASH_BY_PERM = [("admin.users", dash_admin), ("reports.view", dash_owner), ("accounting.view", dash_finance),
                ("sales.create", dash_sales), ("delivery.validate", dash_warehouse), ("purchase.create", dash_procurement),
                ("quality.check", dash_quality)]


# ---------------------------------------------------------------- Hak akses per user (Master Admin)
@bp.get("/admin/users/<int:uid>/permissions")
@require("admin.roles")
def admin_user_permissions(uid):
    u = one("SELECT id, username, full_name, role, level FROM users WHERE id=?", (uid,))
    if not u:
        return err("User tidak ditemukan", 404)
    rows = get_db().execute("SELECT permission, effect FROM user_permissions WHERE user_id=?", (uid,)).fetchall()
    return ok({"user": dict(u), "role_permissions": permissions_for(u["role"]),
               "grants": sorted(r["permission"] for r in rows if r["effect"] == "grant"),
               "revokes": sorted(r["permission"] for r in rows if r["effect"] == "revoke"),
               "effective": sorted(effective_permissions(uid, u["role"]))})


@bp.put("/admin/users/<int:uid>/permissions")
@require("admin.roles")
@tx
def admin_set_user_permissions(uid):
    u = one("SELECT * FROM users WHERE id=?", (uid,))
    if not u:
        return err("User tidak ditemukan", 404)
    wanted = set(body().get("permissions") or [])
    unknown = wanted - set(ALL_PERMS)
    if unknown:
        return err(f"Permission tidak dikenal: {', '.join(sorted(unknown))}")
    wanted.add("dashboard.view")
    if uid == session.get("user_id") and not {"admin.users", "admin.roles"} <= wanted:
        return err("Tidak dapat mencabut hak admin dari akun sendiri", 409)
    base = set(permissions_for(u["role"]))
    grants, revokes = sorted(wanted - base), sorted(base - wanted)
    db = get_db()
    before = set(effective_permissions(uid, u["role"]))
    db.execute("DELETE FROM user_permissions WHERE user_id=?", (uid,))
    for p_ in grants:
        db.execute("INSERT INTO user_permissions(user_id,permission,effect) VALUES(?,?,'grant')", (uid, p_))
    for p_ in revokes:
        db.execute("INSERT INTO user_permissions(user_id,permission,effect) VALUES(?,?,'revoke')", (uid, p_))
    added, removed = sorted(wanted - before), sorted(before - wanted)
    if added or removed:
        _admin_log(u["username"], "User permission change", ("+ " + ", ".join(added) if added else "")
                   + (" | " if added and removed else "") + ("− " + ", ".join(removed) if removed else "")
                   + f" (di luar role {u['role']}: {len(grants)} tambahan, {len(revokes)} dicabut)")
    return ok({"added": added, "removed": removed, "grants": grants, "revokes": revokes})


# ---------------------------------------------------------------- Approval center (Owner)
@bp.get("/approvals")
@require("dashboard.view")
def approvals():
    if not (allowed("sales.approve") or allowed("purchase.approve")):
        return deny("sales.approve")
    db = get_db()
    out = []
    if allowed("sales.approve"):
        for s in db.execute("SELECT so.*, c.name customer FROM sales_orders so JOIN customers c ON c.code=so.customer_code "
                            "WHERE so.status='Pending Approval' ORDER BY so.id"):
            out.append({"kind": "sale", "id": s["id"], "number": s["number"], "type": "Diskon > 10%",
                        "party": f"{s['customer_code']} {s['customer']}", "detail": f"Diskon efektif {effective_discount(s['id'])}%",
                        "amount": s["total"], "requested_by": s["created_by"], "created_at": s["created_at"]})
    if allowed("purchase.approve"):
        for p_ in db.execute("SELECT po.*, v.name vendor FROM purchase_orders po JOIN vendors v ON v.code=po.vendor_code "
                             "WHERE po.status='Pending Approval' ORDER BY po.id"):
            out.append({"kind": "purchase", "id": p_["id"], "number": p_["number"], "type": "PO > Rp1.000.000",
                        "party": f"{p_['vendor_code']} {p_['vendor']}", "detail": f"Subtotal {idr(p_['subtotal'])}",
                        "amount": p_["subtotal"], "requested_by": p_["created_by"], "created_at": p_["created_at"]})
    return ok(out)


@bp.post("/sales-orders/<int:oid>/reject-discount")
@require("sales.approve")
@tx
def reject_discount(oid):
    so = one("SELECT * FROM sales_orders WHERE id=?", (oid,))
    if not so or so["status"] != "Pending Approval":
        return err("Dokumen tidak menunggu approval", 409)
    note = (body().get("note") or "").strip() or "Diskon terlalu besar"
    get_db().execute("UPDATE sales_orders SET status='Quotation', discount_approved_by=NULL WHERE id=?", (oid,))
    audit(user(), "Reject discount", so["number"], f"Ditolak: {note}. Sales perlu menurunkan diskon ≤ 10% atau mengajukan ulang.")
    return ok({"status": "Quotation"})


@bp.post("/purchase-orders/<int:oid>/reject")
@require("purchase.approve")
@tx
def reject_po(oid):
    po = one("SELECT * FROM purchase_orders WHERE id=?", (oid,))
    if not po or po["status"] != "Pending Approval":
        return err("PO tidak menunggu approval", 409)
    note = (body().get("note") or "").strip() or "Perlu revisi jumlah/harga"
    get_db().execute("UPDATE purchase_orders SET status='RFQ' WHERE id=?", (oid,))
    audit(user(), "Reject Purchase Order", po["number"], f"Ditolak: {note}")
    return ok({"status": "RFQ"})


# ---------------------------------------------------------------- Untung / rugi (Owner)
def profit_rows(group):
    """Laba kotor dari invoice Posted dikurangi retur ber-credit-note, dikelompokkan per customer/produk/sales."""
    key = {"customer": "s.customer_code || ' ' || c.name", "product": "il.sku || ' ' || p.name || ' ' || COALESCE(p.size,'')",
           "sales": "s.created_by"}[group]
    rkey = {"customer": "s.customer_code || ' ' || c.name", "product": "r.sku || ' ' || p.name || ' ' || COALESCE(p.size,'')",
            "sales": "s.created_by"}[group]
    db = get_db()
    agg = {}
    for r in db.execute(f"SELECT {key} k, SUM(il.net_amount) net, SUM(il.quantity) qty, SUM(il.quantity*p.standard_cost) cogs, "
                        f"SUM(il.discount_amount) disc FROM invoice_lines il JOIN invoices i ON i.id=il.invoice_id "
                        f"JOIN sales_orders s ON s.id=i.order_id JOIN customers c ON c.code=s.customer_code "
                        f"JOIN products p ON p.sku=il.sku WHERE i.status='Posted' GROUP BY k"):
        agg[r["k"]] = {"qty": r["qty"], "revenue": r["net"], "discount": r["disc"], "cogs": r["cogs"], "quality_loss": 0}
    for r in db.execute(f"SELECT {rkey} k, SUM(r.quantity) qty, SUM(r.credit_net) credit, SUM(r.cogs_reversal) rev, "
                        f"SUM(CASE WHEN r.inspection='Damaged' THEN r.cogs_reversal ELSE 0 END) dmg FROM returns r "
                        f"JOIN invoices i ON i.id=r.invoice_id JOIN sales_orders s ON s.id=i.order_id "
                        f"JOIN customers c ON c.code=s.customer_code JOIN products p ON p.sku=r.sku "
                        f"WHERE r.status='Done' GROUP BY k"):
        a = agg.setdefault(r["k"], {"qty": 0, "revenue": 0, "discount": 0, "cogs": 0, "quality_loss": 0})
        a["qty"] -= r["qty"]
        a["revenue"] -= r["credit"]
        a["cogs"] -= r["rev"]
        a["quality_loss"] += r["dmg"]
    out = []
    for k, a in agg.items():
        profit = a["revenue"] - a["cogs"] - a["quality_loss"]
        out.append({group: k, "net_qty": a["qty"], "net_sales": a["revenue"], "discount_given": a["discount"],
                    "cogs": a["cogs"], "quality_loss": a["quality_loss"], "gross_profit": profit,
                    "margin_pct": round(profit / a["revenue"] * 100, 1) if a["revenue"] else 0,
                    "status": "Untung" if profit > 0 else "Rugi" if profit < 0 else "Impas"})
    return sorted(out, key=lambda x: x["gross_profit"])


def pnl_summary():
    rev, disc = -account_balance("4100", True), account_balance("4110", True)
    cogs, ql = account_balance("5100", True), account_balance("6100", True)
    ship, bank = account_balance("6200", True), account_balance("6300", True)
    net_sales = rev - disc
    gp = net_sales - cogs
    return [{"pos": "Sales revenue (invoice posted − credit note)", "amount": rev},
            {"pos": "Diskon penjualan", "amount": -disc}, {"pos": "Net sales", "amount": net_sales},
            {"pos": "COGS (dibukukan saat delivery; revenue menyusul saat invoice di-post)", "amount": -cogs}, {"pos": "Gross profit", "amount": gp},
            {"pos": "Quality loss (retur rusak)", "amount": -ql}, {"pos": "Biaya kirim & bank", "amount": -(ship + bank)},
            {"pos": "Laba bersih operasional", "amount": gp - ql - ship - bank,
             "status": "Untung" if gp - ql - ship - bank > 0 else "Rugi" if gp - ql - ship - bank < 0 else "Impas"}]


@bp.get("/reports/profit")
@require("reports.view")
def profit_report():
    return ok({"summary": pnl_summary(), "by_customer": profit_rows("customer"), "by_product": profit_rows("product"),
               "by_sales": profit_rows("sales")})


# ---------------------------------------------------------------- Manager vs Staff: pekerjaan & kinerja tim
TODAY_SQL = "date(created_at,'+7 hours') = date('now','+7 hours')"


def task_rows(mine_only):
    """Antrean pekerjaan untuk role yang login. Staff Sales/Procurement hanya dokumen miliknya."""
    db, r, me = get_db(), role(), user()
    rows = []
    own = " AND so.created_by=?" if mine_only else ""
    args = (me,) if mine_only else ()
    if r == "Sales":
        for s in db.execute("SELECT so.id, so.number, so.status, so.discount_approved_by, c.name customer, so.created_by FROM sales_orders so "
                            "JOIN customers c ON c.code=so.customer_code WHERE so.status IN ('Quotation','Pending Approval')" + own, args):
            task = "Menunggu approval Owner" if s["status"] == "Pending Approval" else \
                "Siap di-Confirm (diskon disetujui)" if s["discount_approved_by"] else "Lanjutkan & confirm quotation"
            rows.append({"kind": "sale", "id": s["id"], "number": s["number"], "task": task, "party": s["customer"], "owner": s["created_by"]})
        for s in db.execute("SELECT so.*, c.name customer FROM sales_orders so JOIN customers c ON c.code=so.customer_code "
                            "WHERE so.status='Confirmed'" + own, args).fetchall():
            back = sum(l["remaining_qty"] for l in so_lines_status(s))
            if back:
                rows.append({"kind": "sale", "id": s["id"], "number": s["number"], "task": f"Pantau pengiriman: {back} unit belum terkirim",
                             "party": s["customer"], "owner": s["created_by"]})
        for l in db.execute("SELECT l.id, l.number, l.stage, l.title, l.created_by FROM leads l WHERE l.stage NOT IN ('Won','Lost') "
                            "AND l.quotation_id IS NULL" + (" AND l.created_by=?" if mine_only else ""), args):
            rows.append({"kind": "lead", "id": l["id"], "number": l["number"], "task": f"Follow up lead ({l['stage']})",
                         "party": l["title"], "owner": l["created_by"]})
    elif r == "Warehouse":
        for d in db.execute("SELECT d.id, d.number, so.number so FROM deliveries d JOIN sales_orders so ON so.id=d.order_id WHERE d.status='Ready'"):
            rows.append({"kind": "delivery", "id": d["id"], "number": d["number"], "task": "Validate pengiriman", "party": d["so"], "owner": "—"})
        for s in db.execute("SELECT so.*, c.name customer FROM sales_orders so JOIN customers c ON c.code=so.customer_code WHERE so.status='Confirmed'").fetchall():
            free = sum(l["remaining_qty"] - l["pending_ready_qty"] for l in so_lines_status(s))
            if free:
                rows.append({"kind": "sale", "id": s["id"], "number": s["number"], "task": f"Buat delivery order ({free} unit)", "party": s["customer"], "owner": s["created_by"]})
        for p_ in db.execute("SELECT po.* , v.name vendor FROM purchase_orders po JOIN vendors v ON v.code=po.vendor_code WHERE po.status='Confirmed'").fetchall():
            if po_open(p_) and not scalar("SELECT COUNT(*) FROM receipts WHERE purchase_order_id=? AND status<>'Done'", (p_["id"],)):
                rows.append({"kind": "purchase", "id": p_["id"], "number": p_["number"], "task": "Terima barang dari vendor", "party": p_["vendor"], "owner": p_["created_by"]})
        for x in db.execute("SELECT id, number, status FROM receipts WHERE status='Quality Checked'"):
            rows.append({"kind": "receipt", "id": x["id"], "number": x["number"], "task": "Validate receipt (accepted only)", "party": "QC selesai", "owner": "—"})
        for x in db.execute("SELECT id, number, sku, created_by FROM transfers WHERE status='Ready'" + (" AND created_by=?" if mine_only else ""), args):
            rows.append({"kind": "transfer", "id": x["id"], "number": x["number"], "task": "Validate transfer", "party": x["sku"], "owner": x["created_by"]})
        for x in db.execute("SELECT id, number, sku FROM returns WHERE status='Inspected'"):
            rows.append({"kind": "return", "id": x["id"], "number": x["number"], "task": "Proses stock move retur", "party": x["sku"], "owner": "—"})
    elif r == "Procurement":
        for p_ in db.execute("SELECT po.id, po.number, po.status, v.name vendor, po.created_by FROM purchase_orders po JOIN vendors v ON "
                             "v.code=po.vendor_code WHERE po.status IN ('RFQ','Pending Approval')" + (" AND po.created_by=?" if mine_only else ""), args):
            rows.append({"kind": "purchase", "id": p_["id"], "number": p_["number"],
                         "task": "Menunggu approval Owner" if p_["status"] == "Pending Approval" else "Confirm RFQ",
                         "party": p_["vendor"], "owner": p_["created_by"]})
        for x in low_stock_rows()[:8]:
            rows.append({"kind": None, "id": None, "number": x["sku"], "task": f"Buat RFQ: available {x['available']} ≤ minimum {x['minimum']}",
                         "party": x["warehouse_code"], "owner": "—"})
    elif r == "Finance":
        for s in db.execute("SELECT so.*, c.name customer FROM sales_orders so JOIN customers c ON c.code=so.customer_code WHERE so.status='Confirmed'").fetchall():
            q = sum(l["invoiceable_qty"] for l in so_lines_status(s))
            if q:
                rows.append({"kind": "sale", "id": s["id"], "number": s["number"], "task": f"Buat invoice ({q} unit terkirim)", "party": s["customer"], "owner": s["created_by"]})
        for x in db.execute("SELECT id, number FROM invoices WHERE status='Draft'"):
            rows.append({"kind": "invoice", "id": x["id"], "number": x["number"], "task": "Post invoice", "party": "", "owner": "—"})
        for x in db.execute("SELECT r.id, r.number FROM receipts r WHERE r.status='Done' AND NOT EXISTS (SELECT 1 FROM vendor_bills b WHERE b.receipt_id=r.id)"):
            rows.append({"kind": "receipt", "id": x["id"], "number": x["number"], "task": "Buat vendor bill", "party": "", "owner": "—"})
        for x in db.execute("SELECT id, number, match_status FROM vendor_bills WHERE status='Draft'"):
            rows.append({"kind": "bill", "id": x["id"], "number": x["number"], "task": "Resolve & post bill" if x["match_status"] == "Mismatch" else "Post bill", "party": x["match_status"], "owner": "—"})
        for i in open_invoice_rows():
            if i["residual"] > 0:
                rows.append({"kind": "invoice", "id": i["id"], "number": i["number"], "task": f"Tagih / catat payment ({idr(i['residual'])})"
                             + (f" — overdue {i['overdue_days']} hari" if i["overdue_days"] else ""), "party": i["customer"], "owner": "—"})
        for x in db.execute("SELECT b.id, b.number, b.total-b.paid_amount res FROM vendor_bills b WHERE b.status='Posted' AND b.total>b.paid_amount"):
            rows.append({"kind": "bill", "id": x["id"], "number": x["number"], "task": f"Bayar vendor ({idr(x['res'])})", "party": "", "owner": "—"})
        for x in db.execute("SELECT id, number FROM returns WHERE status='Received'"):
            rows.append({"kind": "return", "id": x["id"], "number": x["number"], "task": "Buat credit note", "party": "", "owner": "—"})
    elif r == "Quality":
        for x in db.execute("SELECT id, number FROM receipts WHERE status='Waiting'"):
            rows.append({"kind": "receipt", "id": x["id"], "number": x["number"], "task": "Incoming inspection (Pass/Fail)", "party": "", "owner": "—"})
        for x in db.execute("SELECT id, number, sku FROM returns WHERE status='Requested'"):
            rows.append({"kind": "return", "id": x["id"], "number": x["number"], "task": "Return inspection", "party": x["sku"], "owner": "—"})
    return rows


def team_rows():
    db = get_db()
    out = []
    for u in db.execute("SELECT username, full_name, level, active FROM users WHERE role=? ORDER BY level, username", (role(),)):
        n_today = scalar(f"SELECT COUNT(*) FROM audit_logs WHERE actor=? AND {TODAY_SQL} AND action NOT IN ('Login','Logout')", (u["username"],))
        n_all = scalar("SELECT COUNT(*) FROM audit_logs WHERE actor=? AND action NOT IN ('Login','Logout','Login failed')", (u["username"],))
        last = scalar("SELECT MAX(created_at) FROM audit_logs WHERE actor=? AND action NOT IN ('Login','Logout')", (u["username"],)) or None
        out.append({"user": f"{u['full_name']} ({u['username']})", "level": u["level"], "status": "Active" if u["active"] else "Inactive",
                    "aksi_hari_ini": n_today, "total_aksi": n_all, "aktivitas_terakhir": last})
    return out


def team_sections():
    team = [r["username"] for r in get_db().execute("SELECT username FROM users WHERE role=?", (role(),))]
    q = ",".join("?" * len(team))
    return [T(f"Antrean Pekerjaan Tim {role()}", task_rows(False), None, ["number", "task", "party", "owner"], kind="docs"),
            T("Kinerja Tim (Manager melihat seluruh staff)", team_rows(), "reporting/audit"),
            T("Aktivitas Tim Terbaru", rowdicts(get_db().execute(
                f"SELECT created_at, actor, action, document_ref FROM audit_logs WHERE actor IN ({q}) AND action NOT IN ('Login','Logout') "
                f"ORDER BY id DESC LIMIT 10", team)), "reporting/audit")]


def dash_staff():
    me = user()
    tasks = task_rows(True)
    mine = []
    for kind, table, col in (("sale", "sales_orders", "created_by"), ("lead", "leads", "created_by"), ("purchase", "purchase_orders", "created_by"),
                             ("transfer", "transfers", "created_by"), ("return", "returns", "created_by"), ("receipt", "receipts", "created_by"),
                             ("delivery", "deliveries", "validated_by"), ("invoice", "invoices", "posted_by"), ("bill", "vendor_bills", "posted_by")):
        st = "stage" if table == "leads" else "status"
        for r in get_db().execute(f"SELECT id, number, {st} status FROM {table} WHERE {col}=? ORDER BY id DESC LIMIT 10", (me,)):
            if allowed(DOC_BUILDERS[kind][0]):
                mine.append({"kind": kind, "id": r["id"], "number": r["number"], "status": r["status"]})
    today = rowdicts(get_db().execute(f"SELECT created_at, action, document_ref, details FROM audit_logs WHERE actor=? AND {TODAY_SQL} "
                                      "AND action NOT IN ('Login','Logout') ORDER BY id DESC", (me,)))
    return {"title": f"Pekerjaan Saya — {role()} Staff",
            "focus": "Staff melihat proses kerjanya sendiri: apa yang harus dikerjakan hari ini dan apa yang sudah dikerjakan.",
            "kpis": [K("Tugas Menunggu", len(tasks), "Perlu tindakan Anda", None),
                     K("Aksi Saya Hari Ini", len(today), "Tercatat di audit trail", "reporting/audit"),
                     K("Dokumen Saya", len(mine), "Dibuat / divalidasi oleh Anda", None),
                     K("Level", "Staff", f"Role {role()}", None, "text")],
            "sections": [T("Pekerjaan Hari Ini", tasks, None, ["number", "task", "party"], kind="docs"),
                         T("Dokumen Saya", mine, None, ["number", "kind", "status"], kind="docs"),
                         T("Aktivitas Saya Hari Ini", today, "reporting/audit")]}


def owner_charts():
    """Grafik KPI Owner: tren sales vs purchase, komposisi laba rugi, untung/rugi per produk & customer, stok, status SO."""
    db = get_db()
    months = [r["m"] for r in db.execute(
        "WITH RECURSIVE m(i) AS (SELECT 5 UNION ALL SELECT i-1 FROM m WHERE i>0) "
        "SELECT strftime('%Y-%m', date('now','+7 hours','start of month', '-'||i||' months')) m FROM m")]
    def monthly(sql):
        got = {r["m"]: r["v"] for r in db.execute(sql)}
        return [got.get(m, 0) or 0 for m in months]
    sales = monthly("SELECT strftime('%Y-%m', posted_at, '+7 hours') m, SUM(net_amount) v FROM invoices "
                    "WHERE status='Posted' GROUP BY m")
    credit = monthly("SELECT strftime('%Y-%m', validated_at, '+7 hours') m, SUM(credit_net) v FROM returns "
                     "WHERE status='Done' AND validated_at IS NOT NULL GROUP BY m")
    sales = [a - b for a, b in zip(sales, credit)]
    purchase = monthly("SELECT strftime('%Y-%m', posted_at, '+7 hours') m, SUM(net_amount) v FROM vendor_bills "
                       "WHERE status='Posted' GROUP BY m")
    bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    labels = [bulan[int(m[5:]) - 1] + " " + m[2:4] for m in months]
    pnl = {r["pos"]: r["amount"] for r in pnl_summary()}
    comp = [{"label": "Net sales", "value": pnl["Net sales"]},
            {"label": "COGS", "value": next(v for k, v in pnl.items() if k.startswith("COGS"))},
            {"label": "Gross profit", "value": pnl["Gross profit"]},
            {"label": "Quality loss", "value": pnl["Quality loss (retur rusak)"]},
            {"label": "Biaya kirim & bank", "value": pnl["Biaya kirim & bank"]},
            {"label": "Laba bersih", "value": pnl["Laba bersih operasional"]}]
    if not any(c["value"] for c in comp):
        comp = []
    prod = [{"label": r["product"], "value": r["gross_profit"]} for r in sorted(profit_rows("product"), key=lambda x: -x["gross_profit"])]
    cust = [{"label": r["customer"], "value": r["gross_profit"]} for r in sorted(profit_rows("customer"), key=lambda x: -x["gross_profit"])]
    wh = rowdicts(db.execute(
        "SELECT s.warehouse_code w, SUM(s.on_hand) oh, COALESCE((SELECT SUM(quantity) FROM reservations r "
        "WHERE r.warehouse_code=s.warehouse_code AND r.active=1),0) rs FROM stock s GROUP BY s.warehouse_code"))
    so = [{"label": r["status"], "value": r["n"]} for r in db.execute(
        "SELECT status, COUNT(*) n FROM sales_orders GROUP BY status ORDER BY n DESC")]
    C = lambda title, chart, link=None, **kw: {"title": title, "type": "chart", "chart": chart, "link": link, "rows": [], **kw}
    return [
        C("Tren Penjualan vs Pembelian (6 bulan)", {"kind": "columns", "money": True, "labels": labels,
          "series": [{"name": "Penjualan (invoice posted − credit note)", "color": "green", "values": sales},
                     {"name": "Pembelian (vendor bill posted)", "color": "purple", "values": purchase}]}, "accounting/reports"),
        C("Komposisi Laba Rugi", {"kind": "diverging", "money": True, "rows": comp}, "accounting/reports"),
        C("Untung / Rugi per Produk", {"kind": "diverging", "money": True, "rows": prod}, "reporting/profit"),
        C("Untung / Rugi per Customer", {"kind": "diverging", "money": True, "rows": cust}, "reporting/profit"),
        C("Stok per Gudang", {"kind": "columns", "money": False, "labels": [w["w"] for w in wh],
          "series": [{"name": "Available", "color": "green", "values": [w["oh"] - w["rs"] for w in wh]},
                     {"name": "Reserved", "color": "orange", "values": [w["rs"] for w in wh]}], "stacked": True}, "inventory/stock"),
        C("Status Sales Order", {"kind": "bars", "money": False, "rows": so}, "sales/quotations"),
    ]


@bp.get("/dashboard/role")
@require("dashboard.view")
def role_dashboard():
    if level() == "Staff" and role() in ("Sales", "Warehouse", "Procurement", "Finance", "Quality"):
        return ok(dash_staff())
    fn = DASH.get(role()) or next((f for p, f in DASH_BY_PERM if allowed(p)), dash_owner)
    d = fn()
    if role() in ("Sales", "Warehouse", "Procurement", "Finance", "Quality"):
        d["title"] = d["title"].replace("Dashboard", "Dashboard — Manager")
        d["sections"] = team_sections() + d["sections"]
    if role() == "Owner" or (fn is dash_owner and allowed("reports.view")):
        d["sections"] = owner_charts() + [T("Laba Rugi Perusahaan", pnl_summary(), "accounting/reports"),
                         T("Untung / Rugi per Customer", profit_rows("customer"), "reporting/profit",
                           ["customer", "net_sales", "cogs", "quality_loss", "gross_profit", "margin_pct", "status"]),
                         T("Untung / Rugi per Produk", profit_rows("product"), "reporting/profit",
                           ["product", "net_qty", "net_sales", "cogs", "gross_profit", "margin_pct", "status"]),
                         T("Penjualan per Sales (pembuat SO)", profit_rows("sales"), "reporting/profit",
                           ["sales", "net_sales", "discount_given", "gross_profit", "status"])] + d["sections"]
    return ok(d)


# ---------------------------------------------------------------- Owner Executive Dashboard
def _status(v):
    return "UNTUNG" if v > 0 else "RUGI" if v < 0 else "IMPAS"


@bp.get("/dashboard/executive")
@require("reports.view")
def executive_dashboard():
    """Dashboard eksekutif Owner: KPI, approval, laba rugi, profit per departemen, top produk/customer, operasional, grafik."""
    db = get_db()
    rev, disc = -account_balance("4100", True), account_balance("4110", True)
    cogs, ql = account_balance("5100", True), account_balance("6100", True)
    ship, bank = account_balance("6200", True), account_balance("6300", True)
    net_sales = rev - disc
    gross = net_sales - cogs
    net = gross - ql - ship - bank
    on_hand = scalar("SELECT COALESCE(SUM(on_hand),0) FROM stock")
    reserved = scalar("SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE active=1")
    sos = db.execute("SELECT * FROM sales_orders").fetchall()
    pos = db.execute("SELECT * FROM purchase_orders").fetchall()
    pend = approvals()[0].get_json() if (allowed("sales.approve") or allowed("purchase.approve")) else []
    purchase_posted = scalar("SELECT COALESCE(SUM(net_amount),0) FROM vendor_bills WHERE status='Posted'")
    mapped = ("4100", "4110", "5100", "6100", "6200", "6300")
    other = sum(-account_balance(a["code"], True) for a in db.execute("SELECT code, type FROM accounts WHERE type IN ('Revenue','Contra Revenue','Expense')")
                if a["code"] not in mapped)
    depts = [
        {"dept": "Sales", "value": gross, "status": _status(gross), "note": "Net sales − COGS (kontribusi penjualan)"},
        {"dept": "Warehouse", "value": -ship, "status": _status(-ship), "note": "Biaya kirim (akun 6200)"},
        {"dept": "Quality", "value": -ql, "status": _status(-ql), "note": "Quality loss retur rusak (akun 6100)"},
        {"dept": "Finance", "value": -bank, "status": _status(-bank), "note": "Biaya bank (akun 6300)"},
        {"dept": "Procurement", "value": 0, "status": "UNALLOCATED",
         "note": f"Pembelian {idr(purchase_posted)} masuk persediaan, bukan beban (menjadi COGS saat terjual)"},
        {"dept": "Unallocated", "value": other, "status": "UNALLOCATED" if not other else _status(other),
         "note": "Akun pendapatan/beban lain yang tidak dipetakan ke departemen"},
    ]
    ranked = [d for d in depts if d["status"] not in ("UNALLOCATED",) and d["value"]]
    best = max(ranked, key=lambda d: d["value"])["dept"] if ranked else None
    worst = min(ranked, key=lambda d: d["value"]) if ranked else None
    worst = worst["dept"] if worst and worst["value"] < 0 else None
    prod = sorted(profit_rows("product"), key=lambda x: -x["gross_profit"])
    cust = sorted(profit_rows("customer"), key=lambda x: -x["gross_profit"])
    return ok({
        "kpis": [
            K("Total Revenue", rev, "Invoice Posted", "accounting/trialbalance/4100", "money"),
            K("Net Sales", net_sales, "Revenue − Diskon", "reporting/profit", "money"),
            K("Gross Profit", gross, "Revenue − COGS", "reporting/profit", "money"),
            K("Net Profit", net, "Untung ✓" if net > 0 else "Rugi ✕" if net < 0 else "Impas", "accounting/reports", "money"),
            K("Outstanding AR", account_balance("1100"), "Piutang belum lunas", "accounting/trialbalance/1100", "money"),
            K("Inventory Value", scalar("SELECT COALESCE(SUM(s.on_hand*p.standard_cost),0) FROM stock s JOIN products p ON p.sku=s.sku"),
              f"{on_hand} unit on hand", "inventory/stock", "money"),
            K("Open SO", sum(1 for x in sos if so_open(x)), "Sales order aktif", "sales/quotations"),
            K("Pending Approvals", len(pend), "Diskon + PO besar", "reporting/approvals"),
        ],
        "approvals": pend,
        "pnl": [{"pos": "Sales Revenue", "amount": rev}, {"pos": "Diskon Penjualan", "amount": -disc},
                {"pos": "Net Sales", "amount": net_sales, "strong": True}, {"pos": "COGS", "amount": -cogs},
                {"pos": "Gross Profit", "amount": gross, "strong": True},
                {"pos": "Quality Loss", "amount": -ql}, {"pos": "Biaya Kirim & Bank", "amount": -(ship + bank)},
                {"pos": "Laba Bersih", "amount": net, "strong": True}],
        "net_status": _status(net), "net_profit": net,
        "departments": depts, "best_dept": best, "worst_dept": worst,
        "top_products": [{"label": r["product"], "value": r["gross_profit"], "margin": r["margin_pct"], "status": r["status"]} for r in prod[:5]],
        "top_customers": [{"label": r["customer"], "value": r["gross_profit"], "margin": r["margin_pct"], "status": r["status"]} for r in cust[:5]],
        "operations": [
            K("On Hand", on_hand, "Total stok fisik", "inventory/stock"),
            K("Reserved", reserved, "Dialokasikan ke SO", "inventory/stock"),
            K("Available", on_hand - reserved, "On Hand − Reserved", "inventory/stock"),
            K("Open PO", sum(1 for x in pos if po_open(x)), "PO aktif", "purchase/purchase"),
            K("Open Lead", scalar("SELECT COUNT(*) FROM leads WHERE stage NOT IN ('Won','Lost')"), "CRM pipeline", "crm/pipeline"),
            K("QC Queue", scalar("SELECT COUNT(*) FROM receipts WHERE status='Waiting'"), "Menunggu inspeksi", "quality/quality"),
        ],
        "charts": owner_charts(),
    })
