"""RBAC SegarRasa ERP (SR-16, F-01) — role & permission disimpan di database.

- Katalog permission (CATALOG) dikelompokkan per modul dengan aksi CRUD / Approve / Post.
- Default akses tiap role mengikuti matriks akses kelompok (F-02..F-23).
- Master Admin dapat membuat role, mengubah permission, dan mengelola user dari UI.
- Otorisasi ditegakkan di API; menu yang disembunyikan BUKAN batas keamanan.
"""
from functools import wraps
from flask import session, jsonify, request, g

# (permission, modul, aksi, label)
CATALOG = [
    ("dashboard.view", "Dashboard", "Read", "Lihat dashboard role"),
    ("reports.view", "Dashboard", "Read", "Lihat KPI keuangan perusahaan"),
    ("contacts.view", "Contacts", "Read", "Lihat customer & vendor"),
    ("customers.manage", "Contacts", "Create", "Buat / ubah data & kontak customer"),
    ("customers.credit", "Contacts", "Update", "Ubah credit limit & payment terms"),
    ("vendors.manage", "Contacts", "Create", "Buat / ubah vendor & pricelist"),
    ("products.view", "Products", "Read", "Lihat product & variant SKU"),
    ("products.manage", "Products", "Create", "Buat variant SKU baru"),
    ("crm.view", "CRM", "Read", "Lihat lead / opportunity / pipeline"),
    ("crm.create", "CRM", "Create", "Buat lead & activity"),
    ("crm.edit", "CRM", "Update", "Ubah stage opportunity"),
    ("sales.view", "Sales", "Read", "Lihat quotation & sales order"),
    ("sales.create", "Sales", "Create", "Buat quotation"),
    ("sales.edit", "Sales", "Update", "Ubah quotation / diskon / revisi"),
    ("sales.cancel", "Sales", "Delete", "Batalkan quotation / SO"),
    ("sales.confirm", "Sales", "Post", "Confirm sales order (request approval)"),
    ("sales.approve", "Sales", "Approve", "Approve diskon > 10%"),
    ("inventory.view", "Inventory", "Read", "Lihat stok, reservasi, stock move"),
    ("warehouses.manage", "Inventory", "Create", "Kelola lokasi gudang"),
    ("delivery.view", "Inventory", "Read", "Lihat delivery order"),
    ("delivery.create", "Inventory", "Create", "Buat delivery order"),
    ("delivery.validate", "Inventory", "Post", "Validate delivery (stok keluar)"),
    ("transfer.view", "Inventory", "Read", "Lihat internal transfer"),
    ("transfer.create", "Inventory", "Create", "Buat internal transfer"),
    ("transfer.validate", "Inventory", "Post", "Validate transfer"),
    ("lots.view", "Inventory", "Read", "Lihat lot & expiry"),
    ("lots.manage", "Inventory", "Update", "Input lot & expiry saat receipt"),
    ("lots.inspect", "Quality", "Update", "Inspect / hold / release lot"),
    ("purchase.view", "Purchase", "Read", "Lihat RFQ / PO"),
    ("purchase.create", "Purchase", "Create", "Buat RFQ"),
    ("purchase.cancel", "Purchase", "Delete", "Batalkan RFQ"),
    ("purchase.confirm", "Purchase", "Post", "Confirm PO / request approval"),
    ("purchase.approve", "Purchase", "Approve", "Approve PO > Rp1.000.000"),
    ("receipt.view", "Purchase", "Read", "Lihat receipt"),
    ("receipt.create", "Purchase", "Create", "Catat penerimaan barang"),
    ("receipt.validate", "Purchase", "Post", "Validate receipt (accepted masuk stok)"),
    ("quality.view", "Quality", "Read", "Lihat hasil quality check"),
    ("quality.check", "Quality", "Update", "Input Pass / Fail & alasan"),
    ("returns.view", "Returns", "Read", "Lihat retur"),
    ("returns.create", "Returns", "Create", "Ajukan retur pelanggan"),
    ("returns.inspect", "Returns", "Update", "Return inspection (Saleable/Damaged)"),
    ("returns.receive", "Returns", "Update", "Proses stock move retur"),
    ("returns.validate", "Returns", "Post", "Buat credit note & AR adjustment"),
    ("invoicing.view", "Invoicing", "Read", "Lihat customer invoice"),
    ("invoicing.create", "Invoicing", "Create", "Buat draft invoice"),
    ("invoicing.post", "Invoicing", "Post", "Post invoice"),
    ("bills.view", "Invoicing", "Read", "Lihat vendor bill"),
    ("bills.create", "Invoicing", "Create", "Buat vendor bill (three-way match)"),
    ("bills.post", "Invoicing", "Post", "Post / resolve vendor bill"),
    ("payments.view", "Invoicing", "Read", "Lihat payment"),
    ("payments.create", "Invoicing", "Create", "Register payment"),
    ("accounting.view", "Accounting", "Read", "Lihat journal, ledger, laporan"),
    ("tax.view", "Accounting", "Read", "Lihat pengaturan pajak"),
    ("tax.manage", "Accounting", "Update", "Ubah pengaturan pajak"),
    ("audit.view", "Audit", "Read", "Lihat seluruh audit trail"),
    ("audit.financial", "Audit", "Read", "Lihat aktivitas keuangan"),
    ("audit.quality", "Audit", "Read", "Lihat aktivitas QC"),
    ("admin.users", "Administration", "Create", "Kelola user (create/edit/aktif/nonaktif)"),
    ("admin.roles", "Administration", "Update", "Kelola role & permission"),
    ("admin.logs", "Administration", "Read", "Login history & riwayat permission"),
    ("system.reset", "Administration", "Delete", "Reset baseline seed"),
]
ALL_PERMS = [c[0] for c in CATALOG]
VIEWS = [p for p in ALL_PERMS if p.endswith(".view")]

ROLES = [
    ("Admin", "Master Admin", "Mengelola user, role dan hak akses. Bukan pelaku transaksi/approval."),
    ("Owner", "Owner", "Pengawasan seluruh perusahaan dan approval diskon > 10% serta PO > Rp1.000.000."),
    ("Sales", "Sales", "Customer, CRM, quotation, sales order, delivery order."),
    ("Warehouse", "Warehouse", "Stok per lokasi, receipt, delivery, transfer, stock move retur, lot."),
    ("Procurement", "Procurement", "Vendor, RFQ, purchase order, memantau receipt & bill."),
    ("Finance", "Finance", "Invoice, vendor bill, payment, AR/AP, journal, pajak, credit note."),
    ("Quality", "Quality", "Incoming inspection, pass/fail, return inspection, lot inspection."),
]

DEFAULT_PERMISSIONS = {
    "Admin": {"dashboard.view", "admin.users", "admin.roles", "admin.logs", "system.reset", "audit.view",
              "products.view", "products.manage"},
    "Owner": set(VIEWS) | {"reports.view", "audit.view", "sales.approve", "purchase.approve"},
    "Sales": {"dashboard.view", "contacts.view", "customers.manage", "products.view", "inventory.view",
              "crm.view", "crm.create", "crm.edit", "sales.view", "sales.create", "sales.edit", "sales.cancel",
              "sales.confirm", "delivery.view", "invoicing.view", "returns.view",
              "returns.create", "lots.view"},
    "Warehouse": {"dashboard.view", "products.view", "inventory.view", "warehouses.manage", "sales.view",
                  "delivery.view", "delivery.create", "delivery.validate", "transfer.view", "transfer.create",
                  "transfer.validate", "purchase.view", "receipt.view", "receipt.create", "receipt.validate",
                  "quality.view", "returns.view", "returns.receive", "lots.view", "lots.manage"},
    "Procurement": {"dashboard.view", "contacts.view", "vendors.manage", "products.view", "products.manage", "inventory.view",
                    "purchase.view", "purchase.create", "purchase.cancel", "purchase.confirm",
                    "receipt.view", "quality.view", "bills.view", "lots.view"},
    "Finance": {"dashboard.view", "reports.view", "contacts.view", "customers.credit", "products.view",
                "inventory.view", "sales.view", "delivery.view", "purchase.view", "receipt.view",
                "transfer.view", "invoicing.view", "invoicing.create", "invoicing.post", "bills.view",
                "bills.create", "bills.post", "payments.view", "payments.create", "accounting.view",
                "tax.view", "tax.manage", "returns.view", "returns.validate", "audit.financial"},
    "Quality": {"dashboard.view", "products.view", "purchase.view", "receipt.view", "quality.view",
                "quality.check", "bills.view", "returns.view", "returns.inspect", "lots.view", "lots.inspect",
                "audit.quality"},
}

# App switcher (S-01)
APPS = [
    {"key": "sales", "name": "Sales", "perm": "sales.view"},
    {"key": "crm", "name": "CRM", "perm": "crm.view"},
    {"key": "purchase", "name": "Purchase", "perm": "purchase.view"},
    {"key": "inventory", "name": "Inventory", "perm": "inventory.view"},
    {"key": "accounting", "name": "Accounting", "perm": "accounting.view"},
    {"key": "invoicing", "name": "Invoicing", "perm": "invoicing.view"},
    {"key": "quality", "name": "Quality", "perm": "quality.view"},
    {"key": "admin", "name": "Administration", "perm": "admin.users"},
]


def role():
    return session.get("user", {}).get("role")


def permissions_for(r):
    from .db import get_db
    return sorted(x["permission"] for x in get_db().execute(
        "SELECT permission FROM role_permissions WHERE role=?", (r,)))


def effective_permissions(user_id, role_code):
    """Hak akses efektif = permission role + grant individu − revoke individu."""
    from .db import get_db
    perms = set(permissions_for(role_code))
    for r in get_db().execute("SELECT permission, effect FROM user_permissions WHERE user_id=?", (user_id,)):
        if r["effect"] == "grant":
            perms.add(r["permission"])
        else:
            perms.discard(r["permission"])
    return perms


def level():
    return session.get("user", {}).get("level", "Manager")


def current_permissions():
    if "perms" not in g:
        g.perms = effective_permissions(session.get("user_id"), role()) if role() else set()
    return g.perms


def allowed(permission):
    return permission in current_permissions()


def deny(permission):
    from .db import audit, get_db
    try:
        audit(session.get("user", {}).get("username", "anonymous"), "Access denied",
              request.path, f"role={role()} required={permission}")
        get_db().commit()
    except Exception:
        pass
    return jsonify({"error": "Akses ditolak untuk role ini", "required_permission": permission}), 403


def check_active():
    """User yang dinonaktifkan atau rolenya diganti langsung kehilangan sesi."""
    from .db import get_db
    if not session.get("user_id"):
        return False
    u = get_db().execute("SELECT active, role, level FROM users WHERE id=?", (session["user_id"],)).fetchone()
    if not u or not u["active"]:
        session.clear()
        return False
    if u["role"] != role() or u["level"] != session["user"].get("level"):
        session["user"]["role"] = u["role"]
        session["user"]["level"] = u["level"]
        session.modified = True
        g.pop("perms", None)
    return True


def require(permission):
    def deco(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            if not check_active():
                return jsonify({"error": "Authentication required"}), 401
            if not allowed(permission):
                return deny(permission)
            return fn(*args, **kwargs)
        return wrapped
    return deco
