/* SegarRasa ERP — UI (Vanilla JS)
 * Alur UI: App switcher → menu app → List/Kanban → Form (status bar, smart buttons, Log Notes).
 * Catatan: menu yang disembunyikan BUKAN batas keamanan; semua aturan ditegakkan di API.
 */
const $ = s => document.querySelector(s);
let ME = null;
const can = p => !!ME && ME.permissions.includes(p);
let WAREHOUSES = [];
const whOptions = (sel) => WAREHOUSES.map(w => `<option value="${esc(w.code)}" ${w.code === sel ? "selected" : ""}>${esc(w.code)} · ${esc(w.name)}</option>`).join("");
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => "Rp " + Number(n || 0).toLocaleString("id-ID");
const num = n => Number(n || 0).toLocaleString("id-ID");
const go = h => { if (location.hash === "#" + h) route(); else location.hash = h; };

async function api(path, opts = {}) {
    const r = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, credentials: "same-origin", ...opts });
    let d = {};
    try { d = await r.json(); } catch (e) { }
    if (!r.ok) { const e = Error(d.error || `Request gagal (${r.status})`); e.status = r.status; e.data = d; throw e; }
    return d;
}
const post = (p, body) => api(p, { method: "POST", body: JSON.stringify(body || {}) });

function notice(msg, error = false) {
    $("#notice").innerHTML = `<div class="notice ${error ? "error" : ""}">${esc(msg)}</div>`;
    clearTimeout(notice.t); notice.t = setTimeout(() => $("#notice").innerHTML = "", 7000);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------- tanggal: SQLite menyimpan UTC → tampil WIB ---------------- */
function formatWIB(val, withSeconds = false) {
    if (!val || typeof val !== "string") return val ?? "—";
    const m = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return val;
    const [, y, mo, d, hh, mm, ss] = m;
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +(ss || 0)));
    const p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: withSeconds ? "2-digit" : undefined, hour12: false })
        .formatToParts(dt).forEach(x => p[x.type] = x.value);
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}${withSeconds ? ":" + p.second : ""} WIB`;
}

/* ---------------- format sel tabel ---------------- */
const MONEY = /(^|_)(subtotal|tax|total|amount|net|value|debit|credit|residual|cost|price|exposure|headroom|limit|ar|ap|cogs|sales|profit|paid|credited|reversal|balance|uninvoiced)(_|$)/;
const NOT_MONEY = /(qty|quantity|pct|count|units|_id$|^id$|number|code|status)/;
function isMoney(k) { k = String(k).toLowerCase(); return MONEY.test(k) && !NOT_MONEY.test(k); }
function badge(v) { const c = String(v || "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, ""); return `<span class="badge ${c}">${esc(v)}</span>`; }
function cell(k, v) {
    if (v === null || v === undefined || v === "") return '<span class="muted">—</span>';
    if (typeof v === "number" && isMoney(k)) return fmt(v);
    if (typeof v === "number") return num(v);
    if (/status|stage|^state$|match_status|inspection/i.test(k)) return badge(v);
    if (/_at$|_date$|^date$/.test(k)) return formatWIB(v);
    return esc(v);
}
const label = k => String(k).replace(/_/g, " ");

function table(rows, opts = {}) {
    if (!Array.isArray(rows) || !rows.length) return `<div class="empty">${opts.empty || "Belum ada data."}</div>`;
    const keys = opts.columns || Object.keys(rows[0]);
    const head = keys.map(k => `<th class="${typeof rows[0][k] === "number" ? "num" : ""}">${esc(label(k))}</th>`).join("");
    const body = rows.map((r, i) => `<tr ${opts.open ? `class="clickable" data-i="${i}"` : ""}>${keys.map(k =>
        `<td class="${typeof r[k] === "number" ? "num" : ""}">${cell(k, r[k])}</td>`).join("")}</tr>`).join("");
    const html = `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    if (!opts.open) return html;
    const id = "t" + Math.random().toString(36).slice(2);
    setTimeout(() => document.querySelectorAll(`#${id} tr.clickable`).forEach(tr =>
        tr.onclick = () => opts.open(rows[+tr.dataset.i])));
    return `<div id="${id}">${html}</div>`;
}

/* ---------------- List / Kanban view dengan Search · Filters · Group By ---------------- */
function listView(el, cfg) {
    const st = { q: "", status: "", group: "", view: cfg.defaultView || "list" };
    const statusKey = cfg.statusKey || "status";
    const statuses = [...new Set(cfg.rows.map(r => r[statusKey]).filter(Boolean))];
    function filtered() {
        return cfg.rows.filter(r => (!st.status || r[statusKey] === st.status) &&
            (!st.q || Object.values(r).some(v => String(v ?? "").toLowerCase().includes(st.q.toLowerCase()))));
    }
    function body() {
        const rows = filtered();
        if (st.view === "kanban" && cfg.kanban) {
            const cols = cfg.kanban.order || [...new Set(rows.map(r => r[cfg.kanban.by]))];
            const html = cols.map(c => {
                const items = rows.filter(r => r[cfg.kanban.by] === c);
                return `<div class="kcol"><h4>${esc(c)} <span class="muted">${items.length}</span></h4>${items.map(r =>
                    `<div class="kcard" data-id="${esc(r.id)}">${cfg.kanban.card(r)}</div>`).join("") || '<div class="muted" style="font-size:11px;padding:4px">0 dokumen</div>'}</div>`;
            }).join("");
            return `<div class="kanban">${html}</div>`;
        }
        if (st.group) {
            const groups = {};
            rows.forEach(r => (groups[r[st.group] ?? "—"] = groups[r[st.group] ?? "—"] || []).push(r));
            return Object.entries(groups).map(([g, rs]) => `<h4 class="section-title">${esc(label(st.group))}: ${esc(g)} (${rs.length})</h4>` +
                table(rs, { columns: cfg.columns, open: cfg.open })).join("");
        }
        return table(rows, { columns: cfg.columns, open: cfg.open, empty: cfg.empty });
    }
    function render() {
        const groups = cfg.groupBy || [];
        el.innerHTML = `<div class="list-toolbar">
            <input id="lvq" placeholder="Search…" value="${esc(st.q)}">
            ${statuses.length ? `<select id="lvs"><option value="">Filter: semua ${esc(label(statusKey))}</option>${statuses.map(s => `<option ${s === st.status ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>` : ""}
            ${groups.length ? `<select id="lvg"><option value="">Group by: —</option>${groups.map(g => `<option value="${g}" ${g === st.group ? "selected" : ""}>${esc(label(g))}</option>`).join("")}</select>` : ""}
            ${cfg.kanban ? `<span class="view-toggle"><button data-v="list" class="${st.view === "list" ? "on" : ""}">List</button><button data-v="kanban" class="${st.view === "kanban" ? "on" : ""}">Kanban</button></span>` : ""}
            <span class="muted" style="font-size:11px">${filtered().length} record</span></div><div id="lvb">${body()}</div>`;
        const q = el.querySelector("#lvq"); q.oninput = () => { st.q = q.value; el.querySelector("#lvb").innerHTML = body(); bindCards(); };
        el.querySelector("#lvs") && (el.querySelector("#lvs").onchange = e => { st.status = e.target.value; render(); });
        el.querySelector("#lvg") && (el.querySelector("#lvg").onchange = e => { st.group = e.target.value; render(); });
        el.querySelectorAll(".view-toggle button").forEach(b => b.onclick = () => { st.view = b.dataset.v; render(); });
        bindCards();
    }
    function bindCards() {
        el.querySelectorAll(".kcard").forEach(c => c.onclick = e => {
            if (e.target.closest("button")) return;
            const r = cfg.rows.find(x => String(x.id) === c.dataset.id); r && cfg.open && cfg.open(r);
        });
        cfg.afterRender && cfg.afterRender(el);
    }
    render();
}

/* ---------------- Modal ---------------- */
function openModal(title, bodyHtml, submit, submitLabel = "Save") {
    const m = document.createElement("div");
    m.className = "modal-backdrop";
    m.innerHTML = `<div class="modal"><div class="modal-head"><h3>${esc(title)}</h3><button class="btn" data-x>✕</button></div>
      <div class="modal-body">${bodyHtml}</div><div id="modalErr"></div>
      <div class="modal-actions"><button class="btn" data-x>Cancel</button>${submit ? `<button class="btn primary" data-ok>${esc(submitLabel)}</button>` : ""}</div></div>`;
    document.body.append(m);
    m.querySelectorAll("[data-x]").forEach(b => b.onclick = () => m.remove());
    const okBtn = m.querySelector("[data-ok]");
    if (okBtn) okBtn.onclick = async () => {
        okBtn.disabled = true;
        try { const msg = await submit(m); m.remove(); if (msg) notice(msg); route(); }
        catch (e) { m.querySelector("#modalErr").innerHTML = `<div class="notice error">${esc(e.message)}</div>`; okBtn.disabled = false; }
    };
    return m;
}

/* ---------------- Apps & menu ---------------- */
const APP_META = {
    sales: { icon: "▤", color: "#2e7d4f", desc: "Quotation / Sales Orders" },
    crm: { icon: "◎", color: "#e07a2e", desc: "Lead · Opportunity" },
    purchase: { icon: "▧", color: "#2f7fd1", desc: "RFQ / Purchase Order" },
    inventory: { icon: "▥", color: "#6f9a1f", desc: "Stock overview · Delivery · Receipt" },
    accounting: { icon: "▣", color: "#c07a12", desc: "Journal · Ledger · Vendor Bills" },
    invoicing: { icon: "₨", color: "#3d8b8b", desc: "Customer Invoice · Payment" },
    quality: { icon: "✓", color: "#c99a06", desc: "Quality Checks Pass / Fail" },
    reporting: { icon: "◫", color: "#4f5763", desc: "KPI Dashboard · Audit Log" },
    admin: { icon: "⚙", color: "#2d3748", desc: "User · Role · Permission" },
};
const MENUS = {
    sales: [["Orders / Documents"], ["quotations", "Quotations & Orders", "sales.view"], ["deliveries", "Delivery Orders", "delivery.view"],
        ["invoices", "Customer Invoices", "invoicing.view"], ["Master"], ["customers", "Contacts (Customer)", "contacts.view"],
        ["products", "Products (Variant)", "products.view"], ["Reporting"], ["stock", "Availability", "inventory.view"]],
    crm: [["Pipeline"], ["pipeline", "CRM Pipeline", "crm.view"], ["Master"], ["customers", "Contacts", "contacts.view"]],
    purchase: [["Orders / Documents"], ["purchase", "RFQ / Purchase Orders", "purchase.view"], ["receipts", "Receipts", "receipt.view"],
        ["bills", "Vendor Bills", "bills.view"], ["Master"], ["vendors", "Vendors & Pricelist", "purchase.view"], ["products", "Products", "products.view"]],
    inventory: [["Overview"], ["stock", "Stock & Reservation", "inventory.view"], ["Operations"], ["deliveries", "Delivery Orders", "delivery.view"],
        ["receipts", "Receipts", "receipt.view"], ["transfers", "Internal Transfers", "transfer.view"], ["returns", "Returns", "returns.view"],
        ["lots", "Lot & Expiry", "lots.view"], ["Reporting"], ["moves", "Stock Moves", "inventory.view"], ["Master"],
        ["products", "Products", "products.view"], ["warehouses", "Warehouses", "inventory.view"]],
    quality: [["Quality"], ["quality", "Quality Checks", "quality.view"], ["receipts", "Receipts", "receipt.view"],
        ["returns", "Return Inspection", "returns.view"], ["lots", "Lot & Expiry", "lots.view"]],
    admin: [["Administration"], ["users", "User Management", "admin.users"], ["roles", "Role & Permission", "admin.roles"],
        ["Logs"], ["logins", "Login History", "admin.logs"], ["permlog", "Permission Changes", "admin.logs"],
        ["audit", "Audit Log", "audit.view"], ["Master Data"], ["products", "Products (Variant)", "products.manage"]],
    invoicing: [["Customers"], ["invoices", "Customer Invoices", "invoicing.view"], ["payments", "Payments", "payments.view"],
        ["returns", "Returns & Credit Notes", "returns.view"], ["customers", "Contacts", "contacts.view"], ["Configuration"], ["tax", "Tax (VAT11)", "tax.view"]],
    accounting: [["Accounting"], ["journals", "Journal Entries", "accounting.view"], ["trialbalance", "Trial Balance / GL", "accounting.view"],
        ["reports", "Financial Reports", "accounting.view"],
        ["Vendors"], ["bills", "Vendor Bills", "bills.view"], ["payments", "Payments", "payments.view"], ["Configuration"],
        ["accounts", "Chart of Accounts", "accounting.view"], ["tax", "Tax (VAT11)", "tax.view"]],
    reporting: [["Reporting"], ["owner-dashboard", "Executive Dashboard", "reports.view"], ["kpi", "Dashboard Role Saya", "dashboard.view"], ["approvals", "Approvals", "sales.approve"],
        ["profit", "Untung / Rugi", "reports.view"], ["company", "Company KPI", "reports.view"],
        ["audit", "Audit Trail", "dashboard.view"],
        ["analysis", "Product Analysis", "products.view"], ["profitability", "Customer Profitability", "accounting.view"]],
};

function renderNav(app, page) {
    const items = [];
    let pendingGroup = null;
    (MENUS[app] || []).forEach(it => {
        if (it.length === 1) { pendingGroup = it; return; }
        if (!can(it[2])) return;
        if (pendingGroup) { items.push(pendingGroup); pendingGroup = null; }
        items.push(it);
    });
    $("#navLabel").textContent = app ? (app === "reporting" ? "REPORTING" : app.toUpperCase()) : "MENU";
    $("#nav").innerHTML = `<button data-h="home">◫ <span>Home</span></button>` + items.map(it => it.length === 1
        ? `<div class="group">${esc(it[0].toUpperCase())}</div>`
        : (can(it[2]) ? `<button data-h="${app}/${it[0]}" class="${it[0] === page ? "active" : ""}">• <span>${esc(it[1])}</span></button>` : "")).join("");
    $("#nav").querySelectorAll("button").forEach(b => b.onclick = () => go(b.dataset.h));
}
function crumb(parts) {
    $("#crumb").innerHTML = parts.map((p, i) => i < parts.length - 1 ? (p[1] ? `<a onclick="go('${p[1]}')">${esc(p[0])}</a> / ` : `${esc(p[0])} / `) : `<b>${esc(p[0])}</b>`).join("");
}
function heading(t, sub = "") { $("#heading").textContent = t; $("#subheading").textContent = sub; $("#actions").innerHTML = ""; }
function actions(btns) {
    $("#actions").innerHTML = btns.filter(Boolean).map((b, i) => `<button class="btn ${b.primary ? "primary" : ""}" data-a="${i}">${esc(b.label)}</button>`).join("");
    $("#actions").querySelectorAll("button").forEach(x => x.onclick = () => btns.filter(Boolean)[+x.dataset.a].fn());
}

/* ---------------- Router ---------------- */
window.addEventListener("hashchange", () => route());
async function route() {
    if (!ME) return;
    try { ME = await api("/me"); showUser(); } catch (e) { if (e.status === 401) { location.reload(); return; } }
    const [a, b, c] = (location.hash.slice(1) || "home").split("/").map(decodeURIComponent);
    const content = $("#pageContent");
    content.innerHTML = '<div class="empty">Loading…</div>';
    try {
        if (a === "home") return await renderHome();
        if (a === "doc") return await renderDoc(b, +c);
        if (a === "contact") return await renderContact(b);
        if (a === "product") return await renderProduct(b);
        const page = PAGES[b];
        renderNav(a, b);
        if (!page) { content.innerHTML = '<div class="empty">Halaman tidak ditemukan.</div>'; return; }
        const meta = (MENUS[a] || []).find(x => x[0] === b);
        crumb([["Apps", "home"], [a === "reporting" ? "Reporting" : (ME.apps.find(x => x.key === a)?.name || a), `${a}/${(MENUS[a] || []).find(x => x.length > 1)?.[0]}`], [meta ? meta[1] : b]]);
        heading(meta ? meta[1] : b, page.sub || "");
        await page.render(content, a, c);
    } catch (e) {
        if (e.status === 403) return denied(e);
        content.innerHTML = `<div class="notice error">${esc(e.message)}</div>`;
    }
}
function denied(e) {
    heading("Akses ditolak", "SR-16: setiap orang hanya melihat yang dibutuhkan.");
    $("#pageContent").innerHTML = `<div class="sheet denied-page"><p class="big">403</p><h2>Akses ditolak untuk role ${esc(ME.user.role)}</h2>
      <p class="muted">Permission yang dibutuhkan: <b>${esc(e.data?.required_permission || "-")}</b>. Tidak ada data yang dikirim server. Percobaan ini tercatat di Audit Log.</p>
      <button class="btn" onclick="go('home')">← Kembali ke Home</button></div>`;
}

/* ---------------- S-01 Home / App switcher ---------------- */
async function renderHome() {
    renderNav(null, null); crumb([["Apps"], ["Home"]]);
    heading("Beranda", `Login sebagai ${ME.user.name} (${ME.user.role}) · PT Segar Rasa Riau`);
    if (can("system.reset")) actions([{ label: "⤓ Backup database", fn: backupDb }, { label: "⤒ Restore database", fn: restoreDb }, { label: "↺ Reset baseline seed", fn: resetSeed }]);
    const tiles = Object.entries(APP_META).filter(([k]) => k !== "reporting").map(([k, m]) => {
        const ok = ME.apps.some(a => a.key === k);
        if (!ok && k === "admin") return "";
        const first = (MENUS[k] || []).find(x => x.length > 1 && can(x[2]));
        return `<button class="app-tile ${ok ? "" : "locked"}" ${ok && first ? `onclick="go('${k}/${first[0]}')"` : "disabled"}>
          <div class="ic" style="background:${m.color}">${m.icon}</div><b>${esc(ME.apps.find(a => a.key === k)?.name || k[0].toUpperCase() + k.slice(1))}</b><small>${ok ? m.desc : "Tidak ada izin"}</small></button>`;
    }).join("");
    const isOwner = ME.user.role === "Owner";
    const d = isOwner ? null : await api("/dashboard/role");
    $("#pageContent").innerHTML = `${welcomeBanner()}<div class="section-title">APPS</div><div class="app-grid">${tiles}
        ${can("sales.approve") || can("purchase.approve") ? `<button class="app-tile" onclick="go('reporting/approvals')"><div class="ic" style="background:#c44c4c">✓</div><b>Approvals</b><small>Diskon > 10% · PO > Rp1 jt</small></button>` : ""}
        <button class="app-tile" onclick="go('reporting/audit')"><div class="ic" style="background:#4f5763">◷</div><b>Audit Trail</b><small>${can("audit.view") ? "Seluruh aktivitas" : "Aktivitas sesuai role"}</small></button></div>
      ${isOwner ? `<div class="ex-alert ok" style="cursor:pointer;margin-top:18px" onclick="go('reporting/owner-dashboard')">📊 <b>Owner Executive Dashboard</b> — KPI, laba rugi, profit per departemen dan grafik. Klik untuk membuka →</div>`
        : `<div class="section-title">${esc(d.title.toUpperCase())}</div><p class="muted" style="margin:-4px 0 12px">${esc(d.focus)}</p><div id="roleDash"></div>`}`;
    if (!isOwner) renderRoleDashboard($("#roleDash"), d);
}
function kpiValue(k) { return k.kind === "money" ? fmt(k.value) : k.kind === "text" ? esc(k.value) : num(k.value); }
function bars(rows) {
    if (!rows.length) return '<div class="empty">Belum ada data.</div>';
    const max = Math.max(...rows.map(r => Math.abs(r.value)), 1);
    const money = rows.some(r => Math.abs(r.value) >= 1000);
    return `<div class="bars">${rows.map(r => `<div class="bar-row"><span class="bar-label">${esc(r.label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.max(2, Math.abs(r.value) / max * 100)}%"></span></span>
      <span class="bar-val">${money ? fmt(r.value) : num(r.value)}</span></div>`).join("")}</div>`;
}
const CHART_COLORS = { green: "var(--green)", red: "var(--red)", purple: "#2f7fd1", orange: "#d98a1f" };
function shortMoney(v) {
    const a = Math.abs(v), sg = v < 0 ? "−" : "";
    if (a >= 1e9) return sg + (a / 1e9).toFixed(1).replace(".0", "") + " M";
    if (a >= 1e6) return sg + (a / 1e6).toFixed(1).replace(".0", "") + " jt";
    if (a >= 1e3) return sg + Math.round(a / 1e3) + " rb";
    return sg + a;
}
function columnChart(c) {
    const n = c.labels.length, all = c.series.flatMap(s => s.values);
    if (!n || !all.some(v => v)) return '<div class="empty">Belum ada data — jalankan transaksi (invoice / bill di-post) untuk mengisi grafik.</div>';
    const totals = c.labels.map((_, i) => c.series.reduce((a, s) => a + Math.max(0, s.values[i]), 0));
    const max = Math.max(...(c.stacked ? totals : all), 1);
    const W = 520, H = 220, L = 52, B = 26, T = 10, plotH = H - B - T, gw = (W - L - 8) / n;
    const bw = c.stacked ? Math.min(46, gw * .55) : Math.min(26, gw * .7 / c.series.length);
    const y = v => T + plotH - v / max * plotH, f = c.money ? shortMoney : num;
    let g = "";
    for (let k = 0; k <= 4; k++) {
        const v = max * k / 4, yy = y(v);
        g += `<line x1="${L}" x2="${W - 4}" y1="${yy}" y2="${yy}" class="ch-grid"/><text x="${L - 6}" y="${yy + 4}" class="ch-axis" text-anchor="end">${f(Math.round(v))}</text>`;
    }
    c.labels.forEach((lab, i) => {
        const cx = L + gw * i + gw / 2;
        let base = 0;
        c.series.forEach((s, j) => {
            const v = Math.max(0, s.values[i]), h = v / max * plotH;
            const x = c.stacked ? cx - bw / 2 : cx - bw * c.series.length / 2 + j * bw;
            const top = c.stacked ? y(base + v) : y(v);
            g += `<rect x="${x + 1}" y="${top}" width="${bw - 2}" height="${h}" rx="3" fill="${CHART_COLORS[s.color] || s.color}"><title>${esc(s.name)} · ${esc(lab)}: ${c.money ? fmt(s.values[i]) : num(s.values[i])}</title></rect>`;
            if (c.stacked) base += v;
        });
        g += `<text x="${cx}" y="${H - 8}" class="ch-axis" text-anchor="middle">${esc(lab)}</text>`;
    });
    const legend = c.series.map(s => `<span><i style="background:${CHART_COLORS[s.color] || s.color}"></i>${esc(s.name)}</span>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${g}</svg><div class="ch-legend">${legend}</div>`;
}
function divergingChart(c) {
    const rows = c.rows || [];
    if (!rows.length) return '<div class="empty">Belum ada data — untung/rugi muncul setelah invoice di-post.</div>';
    const max = Math.max(...rows.map(r => Math.abs(r.value)), 1);
    return `<div class="dv">${rows.map(r => {
        const w = Math.abs(r.value) / max * 50, neg = r.value < 0;
        return `<div class="dv-row" title="${esc(r.label)}: ${fmt(r.value)}"><span class="bar-label">${esc(r.label)}</span>
          <span class="dv-track"><span class="dv-fill ${neg ? "neg" : "pos"}" style="width:${Math.max(w, .8)}%;${neg ? `right:50%` : `left:50%`}"></span><span class="dv-axis"></span></span>
          <span class="bar-val ${neg ? "txt-red" : "txt-green"}">${c.money ? fmt(r.value) : num(r.value)}</span></div>`;
    }).join("")}</div><div class="ch-legend"><span><i style="background:var(--green)"></i>Untung</span><span><i style="background:var(--red)"></i>Rugi</span></div>`;
}
function chart(c) {
    if (c.kind === "columns") return columnChart(c);
    if (c.kind === "diverging") return divergingChart(c);
    return bars(c.rows || []);
}
function renderRoleDashboard(el, d) {
    const sec = d.sections.map((s, i) => {
        let body;
        if (s.type === "bars") body = bars(s.rows);
        else if (s.type === "chart") body = chart(s.chart);
        else if (s.type === "docs") body = table(s.rows, { columns: s.columns, open: r => r.kind && go(`doc/${r.kind}/${r.id}`), empty: "Tidak ada dokumen." });
        else body = table(s.rows, { columns: s.columns, empty: "Tidak ada data." });
        return `<div class="panel dash-panel"><div class="dash-head"><h3>${esc(s.title)}</h3>${s.link ? `<button class="btn" onclick="go('${s.link}')">Open →</button>` : ""}</div>${body}</div>`;
    }).join("");
    el.innerHTML = `<div class="grid">${d.kpis.map(k => metric(esc(k.label), kpiValue(k), esc(k.hint), k.link)).join("")}</div><div class="dash-grid">${sec}</div>`;
}
function backupDb() { location.href = "/api/admin/backup"; }
function restoreDb() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".db,.sqlite,.sqlite3";
    inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (!confirm(`Ganti SELURUH data di server ini dengan isi "${f.name}"? Data sekarang akan tertimpa (unduh backup dulu bila perlu).`)) return;
        const fd = new FormData(); fd.append("file", f);
        const r = await fetch("/api/admin/restore", { method: "POST", body: fd, credentials: "same-origin" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { notice(j.error || "Restore gagal", "error"); return; }
        alert(j.message); await post("/logout").catch(() => { }); location.hash = ""; location.reload();
    };
    inp.click();
}
async function resetSeed() {
    if (!confirm("Reset seluruh data ke baseline seed? Semua transaksi uji akan dihapus.")) return;
    await post("/seed/reset"); notice("Baseline seed dipulihkan."); route();
}
function metric(l, v, h, drill) {
    return `<div class="metric ${drill ? "kpi" : ""}" ${drill ? `onclick="go('${drill}')"` : ""}><div class="label">${l}</div><div class="value">${v}</div><div class="hint">${h}</div>${drill ? '<div class="drill">Telusuri dokumen →</div>' : ""}</div>`;
}
function logRow(x) {
    const denied = /denied|blocked|rejected|hold|failed/i.test(x.action);
    return `<div class="log ${denied ? "denied" : ""}"><span class="av">${esc((x.actor || "?")[0].toUpperCase())}</span><span style="flex:1"><b>${esc(x.action)}</b>
      ${x.document_ref ? `<span class="muted">· ${esc(x.document_ref)}</span>` : ""}<br><small>${esc(x.actor)} · ${esc(x.details || "")}</small></span><small>${formatWIB(x.created_at, true)}</small></div>`;
}

/* ---------------- Pages ---------------- */
const PAGES = {};
const docOpen = kind => r => go(`doc/${kind}/${r.id}`);

PAGES.quotations = {
    sub: "Quotation → Sales Order. Diskon >10% butuh Owner; setelah Confirmed harga terkunci.",
    async render(el) {
        const rows = await api("/documents/sales");
        actions([can("sales.create") && { label: "＋ New Quotation", primary: true, fn: () => quotationDialog() }]);
        listView(el, { rows, open: docOpen("sale"), groupBy: ["customer", "status", "warehouse_code"],
            columns: ["number", "customer", "status", "warehouse_code", "discount_pct", "subtotal", "tax", "total", "created_by", "confirmed_at"],
            kanban: { by: "status", order: ["Quotation", "Pending Approval", "Confirmed", "Cancelled"],
                card: r => `<b>${esc(r.number)}</b>${esc(r.customer)}<br><span class="muted">${fmt(r.total)}</span>` } });
    }
};
PAGES.pipeline = {
    sub: "Lead → Opportunity → Quotation → SO. Stage tidak mencatat revenue (SR-18).",
    async render(el) {
        const rows = await api("/documents/leads");
        actions([can("crm.create") && { label: "＋ New Lead", primary: true, fn: leadDialog }]);
        listView(el, { rows, statusKey: "stage", defaultView: "kanban", open: docOpen("lead"), groupBy: ["stage", "customer"],
            columns: ["number", "customer", "title", "stage", "expected_sku", "expected_qty", "quotation", "created_at"],
            kanban: { by: "stage", order: ["New", "Qualified", "Proposition", "Won", "Lost"],
                card: r => `<b>${esc(r.number)}</b>${esc(r.customer_code)} — ${esc(r.customer || "")}<br><span class="muted">${esc(r.title)}</span>
                  ${r.quotation ? `<br><small>Quotation ${esc(r.quotation)}</small>` : ""}
                  ${can("crm.edit") ? `<div class="kact">${["Qualified", "Won", "Lost"].filter(s => s !== r.stage).map(s => `<button class="btn" data-stage="${s}" data-lead="${r.id}">→ ${s}</button>`).join("")}</div>` : ""}` },
            afterRender: x => x.querySelectorAll("[data-stage]").forEach(b => b.onclick = async () => {
                try { await post(`/leads/${b.dataset.lead}/stage`, { stage: b.dataset.stage }); notice(`Stage diubah ke ${b.dataset.stage}. Revenue tetap Rp0.`); route(); }
                catch (e) { notice(e.message, true); }
            }) });
    }
};
PAGES.customers = {
    sub: "Master customer, payment terms, credit limit dan credit exposure (SR-09).",
    async render(el) {
        const rows = await api("/masters/customers");
        actions([can("customers.manage") && { label: "＋ New Customer", primary: true, fn: () => customerDialog() }]);
        listView(el, { rows, open: r => go(`contact/${r.code}`), statusKey: "payment_terms", groupBy: ["city", "payment_terms"],
            columns: ["code", "name", "type", "city", "credit_limit", "payment_terms", "opening_ar"],
            kanban: { by: "city", card: r => `<b>${esc(r.code)} — ${esc(r.name)}</b>Limit ${fmt(r.credit_limit)} · ${esc(r.payment_terms)}` } });
        if (can("accounting.view")) el.insertAdjacentHTML("beforeend", await profitabilityPanel());
    }
};
PAGES.vendors = {
    async render(el) {
        const [vs, pl] = await Promise.all([api("/masters/vendors"), api("/masters/pricelist")]);
        actions([can("vendors.manage") && { label: "＋ New Vendor", primary: true, fn: () => vendorDialog() },
            can("vendors.manage") && { label: "✎ Ubah harga beli", fn: () => priceDialog(vs) }]);
        el.innerHTML = `<div class="panel"><h3>Vendors</h3><div id="vtab"></div></div><div class="panel"><h3>Vendor pricelist</h3>${table(pl)}</div>`;
        $("#vtab").innerHTML = table(vs, { columns: ["code", "name", "city", "payment_terms", "tax_status", "contact_person", "phone", "opening_ap"],
            open: async v => { const h = await api(`/vendors/${v.code}/history`);
                openModal(`${v.code} — ${v.name}`, `<div class="hint-box">Purchase history (${h.length} dokumen)</div>${table(h, { open: r => { document.querySelector(".modal-backdrop")?.remove(); go(`doc/purchase/${r.id}`); } })}`,
                    can("vendors.manage") ? async () => { vendorDialog(v); } : null, "Edit vendor"); } });
    }
};
PAGES.products = {
    sub: "15 variant SKU terpisah; stok, harga dan standard cost per SKU & lokasi (SR-17).",
    async render(el) {
        const rows = await api("/masters/products");
        actions([can("products.manage") && { label: "＋ New Variant SKU", primary: true, fn: productDialog },
            can("warehouses.manage") && { label: "Atur Minimum Stok", fn: setMinimumStock }]);
        listView(el, { rows, open: r => go(`product/${r.sku}`), statusKey: "default_vendor", groupBy: ["name", "default_vendor", "unit"],
            columns: ["sku", "name", "size", "color", "unit", "sales_price", "standard_cost", "default_vendor"],
            kanban: { by: "default_vendor", card: r => `<b>${esc(r.sku)}</b>${esc(r.name)} ${esc(r.size)}<br><span class="muted">Sales ${fmt(r.sales_price)} / Cost ${fmt(r.standard_cost)}</span>` } });
    }
};
PAGES.stock = {
    sub: "Available = On Hand − Reserved per SKU dan lokasi (SR-03/SR-04).",
    async render(el) {
        const [rows, res] = await Promise.all([api("/stock"), api("/stock/reservations")]);
        listView(el, { rows: rows.map(r => ({ id: r.sku, ...r })), statusKey: "warehouse_code", groupBy: ["warehouse_code", "name"],
            columns: ["sku", "name", "size", "warehouse_code", "on_hand", "reserved", "available", "standard_cost", "stock_value"],
            open: r => go(`product/${r.sku}`) });
        el.insertAdjacentHTML("beforeend", `<div class="panel"><h3>Active reservations (source SO)</h3>${table(res)}</div>`);
    }
};
PAGES.deliveries = {
    sub: "Delivery hanya memindahkan jumlah valid; sisa menjadi backorder (SR-02/SR-04).",
    async render(el) {
        const rows = await api("/documents/deliveries");
        actions([can("delivery.create") && { label: "＋ Create Delivery", primary: true, fn: () => deliveryDialog() }]);
        listView(el, { rows, open: docOpen("delivery"), groupBy: ["status", "customer", "warehouse_code"],
            kanban: { by: "status", order: ["Ready", "Done", "Cancelled"], card: r => `<b>${esc(r.number)}</b>${esc(r.sales_order)} · ${esc(r.customer)}` } });
    }
};
PAGES.receipts = {
    sub: "Receipt → Quality Check Pass/Fail → Validate. Hanya accepted qty yang menambah stok (SR-11).",
    async render(el) {
        const rows = await api("/documents/receipts");
        actions([can("receipt.create") && { label: "＋ Receive from PO", primary: true, fn: receiptDialog }]);
        listView(el, { rows, open: docOpen("receipt"), groupBy: ["status", "purchase_order"],
            kanban: { by: "status", order: ["Waiting", "Quality Checked", "Done"], card: r => `<b>${esc(r.number)}</b>${esc(r.purchase_order)} · ${num(r.received)} unit<br><span class="muted">QC ${esc(r.qc_number || "belum")}</span>` } });
    }
};
PAGES.quality = {
    sub: "Inspeksi segel/kemasan. Unit Fail tidak menjadi stok layak jual maupun utang dagang (SR-11).",
    async render(el) {
        const rows = await api("/documents/quality");
        listView(el, { rows, open: docOpen("receipt"), defaultView: "kanban", groupBy: ["status", "purchase_order"],
            kanban: { by: "status", order: ["To Do", "Passed / Failed", "Closed"], card: r => `<b>${esc(r.qc_number)}</b>${esc(r.purchase_order)} / ${esc(r.receipt)}<br><span class="muted">Pass ${num(r.passed)} · Fail ${num(r.failed)}</span>` } });
    }
};
PAGES.purchase = {
    sub: "PO subtotal di atas Rp1.000.000 membutuhkan approval Owner (SR-20).",
    async render(el) {
        const rows = await api("/documents/purchase");
        actions([can("purchase.create") && { label: "＋ New RFQ", primary: true, fn: poDialog }]);
        listView(el, { rows, open: docOpen("purchase"), groupBy: ["vendor", "status"],
            columns: ["number", "vendor_code", "vendor", "status", "subtotal", "tax", "total", "approved_by", "created_by", "created_at"],
            kanban: { by: "status", order: ["RFQ", "Pending Approval", "Confirmed", "Cancelled"], card: r => `<b>${esc(r.number)}</b>${esc(r.vendor)}<br><span class="muted">${fmt(r.subtotal)}</span>` } });
    }
};
PAGES.invoices = {
    sub: "Piutang hanya dibukukan saat invoice Posted untuk delivered quantity (SR-01/SR-02).",
    async render(el) {
        const rows = await api("/documents/invoices");
        actions([can("invoicing.post") && { label: "＋ Create Invoice from SO", primary: true, fn: () => invoiceDialog() }]);
        listView(el, { rows, open: docOpen("invoice"), groupBy: ["customer", "status", "payment_status"],
            kanban: { by: "status", order: ["Draft", "Posted"], card: r => `<b>${esc(r.number)}</b>${esc(r.customer)}<br>${fmt(r.total)} · ${badge(r.payment_status)}` } });
    }
};
PAGES.bills = {
    sub: "Three-way match PO–Receipt–Vendor Bill; selisih ditandai dan posting ditahan (SR-05/SR-06).",
    async render(el) {
        const rows = await api("/documents/bills");
        actions([can("bills.post") && { label: "＋ Create Bill from Receipt", primary: true, fn: billDialog }]);
        listView(el, { rows, open: docOpen("bill"), groupBy: ["status", "match_status", "vendor"],
            kanban: { by: "status", order: ["Draft", "Posted"], card: r => `<b>${esc(r.number)}</b>${esc(r.purchase_order)} · ${badge(r.match_status)}<br>${fmt(r.total)}` } });
    }
};
PAGES.payments = {
    sub: "Partial payment positif dan ≤ residual (SR-10).",
    async render(el) { listView(el, { rows: await api("/documents/payments"), open: docOpen("payment"), statusKey: "document_type", groupBy: ["document_type"] }); }
};
PAGES.transfers = {
    sub: "Transfer antar lokasi; nilai persediaan perusahaan tidak berubah (SR-12).",
    async render(el) {
        const rows = await api("/documents/transfers");
        actions([can("transfer.create") && { label: "＋ New Transfer", primary: true, fn: transferDialog }]);
        listView(el, { rows, open: docOpen("transfer"), groupBy: ["status", "sku"],
            kanban: { by: "status", order: ["Ready", "Done"], card: r => `<b>${esc(r.number)}</b>${esc(r.sku)} × ${r.quantity}<br><span class="muted">${esc(r.from_warehouse)} → ${esc(r.to_warehouse)}</span>` } });
    }
};
PAGES.returns = {
    sub: "Return maksimal net delivered − previously returned; Credit Note membalik revenue & PPN (SR-13).",
    async render(el) {
        const rows = await api("/documents/returns");
        actions([can("returns.create") && { label: "＋ New Return", primary: true, fn: () => returnDialog() }]);
        listView(el, { rows, open: docOpen("return"), groupBy: ["status", "inspection", "invoice"],
            kanban: { by: "status", order: ["Requested", "Done"], card: r => `<b>${esc(r.number)}</b>${esc(r.invoice)} · ${esc(r.sku)} × ${r.quantity}<br>${fmt(r.credit_total)}` } });
    }
};
PAGES.moves = { sub: "Setiap perpindahan stok tercatat sekali (bukti idempotensi SR-15).",
    async render(el) { listView(el, { rows: await api("/documents/moves"), statusKey: "move_type", groupBy: ["move_type", "sku", "reference"] }); } };
PAGES.journals = {
    sub: "Jurnal berpasangan; debit = kredit. Hanya Finance/Owner (SR-16).",
    async render(el) { listView(el, { rows: await api("/documents/journals"), open: docOpen("journal"), statusKey: "source_type", groupBy: ["source_type", "entry_date"] }); }
};
PAGES.trialbalance = {
    sub: "Klik akun untuk membuka General Ledger.",
    async render(el, app, acct) {
        if (acct) {
            const l = await api(`/accounting/ledger/${acct}`);
            heading(`General Ledger ${acct}`, `Saldo ${fmt(l.balance)} (debit − kredit)`);
            el.innerHTML = table(l.lines, { open: r => go(`doc/journal/${r.journal_id}`) });
            return;
        }
        const tb = await api("/accounting/trial-balance");
        el.innerHTML = table(tb.lines, { open: r => go(`accounting/trialbalance/${r.account_code}`) }) +
            `<div class="panel"><b>Total Debit ${fmt(tb.total_debit)} · Total Credit ${fmt(tb.total_credit)} · Selisih ${fmt(tb.difference)}</b></div>`;
    }
};
PAGES.accounts = { async render(el) { el.innerHTML = table(await api("/masters/accounts")); } };
PAGES.tax = {
    sub: "F-21: PPN efektif 12% × 11/12 = 11%, dibulatkan half-up per line.",
    async render(el) {
        const t = await api("/settings/tax");
        el.innerHTML = `<div class="sheet"><div class="fields">${[["Tax code", t.tax_code], ["Label", t.label], ["Nominal rate", t.nominal_rate],
            ["Tax base factor", t.tax_base_factor], ["Effective rate", t.effective_rate], ["Rounding", t.rounding], ["Scope", t.scope],
            ["Contoh: net Rp90.000", `PPN ${fmt(t.example.tax)} · gross ${fmt(t.example.gross)}`]].map(f => `<div class="f"><span>${esc(f[0])}</span><span>${esc(f[1])}</span></div>`).join("")}</div>
            <div class="hint-box">Asumsi simulasi handout untuk barang kemasan non-mewah; bukan nasihat pajak.</div></div>`;
        if (can("tax.manage")) actions([{ label: "✎ Ubah pengaturan pajak", primary: true, fn: () => openModal("Tax setting (Finance)",
            `<div class="form-grid"><div><label>Nominal rate (%)</label><input id="tx_n" value="${esc(String(t.nominal_rate).replace("%", ""))}"></div>
             <div><label>Tax base factor</label><input id="tx_f" value="${esc(t.tax_base_factor)}"></div></div>
             <div class="hint-box">Berlaku untuk dokumen baru; dokumen yang sudah dibuat tidak dihitung ulang. Perubahan tercatat di audit.</div>`,
            async m => { const r = await api("/settings/tax", { method: "PUT", body: JSON.stringify({ nominal_rate: m.querySelector("#tx_n").value, tax_base_factor: m.querySelector("#tx_f").value }) });
                return `Tarif efektif sekarang ${r.effective_rate}.`; }) }]);
    }
};
PAGES.audit = {
    sub: "Actor · timestamp · action · reference. Klik baris untuk melihat dokumen terkait.",
    async render(el) {
        const res = await api("/audit");
        $("#subheading").textContent = `Cakupan: ${res.scope} (F-20). Actor · timestamp · action · reference.`;
        listView(el, { rows: res.rows, statusKey: "actor", groupBy: ["document_ref", "action", "actor"], columns: ["id", "created_at", "actor", "action", "document_ref", "details"] });
    }
};
PAGES.kpi = {
    sub: "KPI sesuai role yang login (F-19). Klik angka untuk menelusuri dokumen.",
    async render(el) { const d = await api("/dashboard/role"); heading(d.title, d.focus); renderRoleDashboard(el, d); }
};
PAGES.company = {
    sub: "KPI rekonsiliasi modul — setiap angka dapat ditelusuri ke dokumen asal (SR-19).",
    async render(el) {
        const d = await api("/dashboard");
        let html = `<div class="grid">
          ${metric("Stock On Hand", num(d.on_hand) + " unit", "WH-PKU + OUT-MRP", "inventory/stock")}
          ${metric("Reserved / Available", `${num(d.reserved)} / ${num(d.available)} unit`, "Available = On Hand − Reserved", "inventory/stock")}
          ${metric("Stock Valuation", fmt(d.stock_value), "Standard cost", "inventory/stock")}
          ${metric("Open SO", d.open_sales_orders, "Quotation/Confirmed belum selesai ditagih", "sales/quotations")}
          ${metric("Open PO", d.open_purchase_orders, "RFQ/Confirmed belum diterima penuh", "purchase/purchase")}
          ${metric("Open Lead", d.open_leads, "Stage selain Won/Lost", "crm/pipeline")}
          ${metric("Pending approval", d.pending_approvals, "SO diskon / PO besar", "purchase/purchase")}
          ${metric("Receipt menunggu QC", d.receipts_waiting_qc, "Quality hold", "quality/quality")}</div>`;
        if (d.finance_visible) html += `<div class="section-title">FINANCE (dari ledger)</div><div class="grid">
          ${metric("Revenue posted", fmt(d.revenue_posted), "Hanya invoice Posted — SO tidak dihitung", "accounting/trialbalance/4100")}
          ${metric("Confirmed SO belum ditagih", fmt(d.uninvoiced_confirmed), "Bukan revenue (SR-18/SR-19)", "sales/quotations")}
          ${metric("Accounts Receivable", fmt(d.ar), "Akun 1100", "accounting/trialbalance/1100")}
          ${metric("Accounts Payable", fmt(d.ap), "Akun 2100", "accounting/trialbalance/2100")}
          ${metric("Bank", fmt(d.bank), "Akun 1010", "accounting/trialbalance/1010")}
          ${metric("Inventory ledger", fmt(d.inventory_ledger), d.inventory_ledger === d.stock_value ? "✓ Rekonsiliasi dengan stock" : "⚠ Beda dengan stock valuation", "accounting/trialbalance/1200")}
          ${metric("Invoice posted", d.invoices_posted, fmt(d.invoices_posted_amount), "invoicing/invoices")}
          ${metric("GRNI terbuka", fmt(d.grni), "Akun 1210", "accounting/trialbalance/1210")}</div>`;
        html += `<div class="panel"><h3>Stock by warehouse</h3>${table(d.stock_by_warehouse)}</div>
          <div class="panel"><h3>Data cutoff</h3><small>${esc(d.data_cutoff)} · ${esc(d.currency)}</small></div>`;
        el.innerHTML = html;
    }
};
PAGES.analysis = { sub: "Analisis stok, reservasi dan performa produk (fitur tambahan tim).",
    async render(el) { actions([can("warehouses.manage") && { label: "Atur Minimum Stok", fn: setMinimumStock }]); el.innerHTML = await productAnalysisPanels(); } };
PAGES.profitability = { sub: "Estimasi laba berdasarkan Invoice Posted (fitur tambahan tim).",
    async render(el) { el.innerHTML = await profitabilityPanel(); } };

/* ---------------- S-02 Contact form ---------------- */
async function renderContact(code) {
    renderNav("sales", "customers"); crumb([["Apps", "home"], ["Contacts", "sales/customers"], [code]]);
    const [cs, ci] = await Promise.all([api("/masters/customers"), api(`/contacts/${code}/credit`)]);
    const c = cs.find(x => x.code === code);
    heading("Contact Customer", "Credit exposure = AR belum lunas + nilai (termasuk PPN) SO Confirmed yang belum ditagih.");
    actions([can("sales.create") && { label: "＋ New Quotation", primary: true, fn: () => quotationDialog(code) },
        can("customers.manage") && { label: "✎ Edit contact", fn: () => customerDialog(c) },
        can("customers.credit") && { label: "✎ Credit limit & terms", fn: () => termsDialog(c) }]);
    const hist = await api(`/customers/${code}/history`);
    $("#pageContent").innerHTML = `<div class="sheet">
      <div class="form-head"><div><small class="muted">Customer</small><h2>${esc(c.code)} — ${esc(c.name)}</h2></div></div>
      <div class="fields">${[["Credit Limit", fmt(c.credit_limit)], ["Payment Terms", c.payment_terms], ["Opening Receivable", fmt(c.opening_ar)],
        ["Invoice belum lunas", fmt(ci.open_invoice_ar)], ["City", c.city], ["Type", c.type], ["Contact person", c.contact_person || "—"],
        ["Phone", c.phone || "—"], ["Email", c.email || "—"], ["Address", c.address || "—"]].map(f => `<div class="f"><span>${f[0]}</span><span>${esc(f[1])}</span></div>`).join("")}</div>
      <div class="grid" style="grid-template-columns:repeat(3,1fr)">
        ${metric("Confirmed SO uninvoiced", fmt(ci.confirmed_uninvoiced), ci.uninvoiced_orders.map(o => `${o.number} · ${fmt(o.uninvoiced)}`).join(", ") || "—")}
        ${metric("Credit Exposure", fmt(ci.exposure), `AR ${fmt(ci.ar_open)} + SO ${fmt(ci.confirmed_uninvoiced)}`)}
        ${metric("Headroom", fmt(ci.headroom), `Limit ${fmt(ci.credit_limit)} − exposure`)}</div>
      <div class="smart" style="margin-top:14px">${ci.uninvoiced_orders.map(o => `<button onclick="go('doc/sale/${o.id}')">↗ ${esc(o.number)}</button>`).join("")}</div>
      ${hist.sales.length ? `<h3 class="section-title">SALES HISTORY</h3><div id="hs"></div>` : ""}
      ${hist.invoices.length ? `<h3 class="section-title">INVOICE HISTORY</h3><div id="hi"></div>` : ""}
      <div class="chatter"><h3>Log Notes / Audit</h3>${(await api(`/history/${encodeURIComponent(code)}`)).map(logRow).join("") || '<small class="muted">Belum ada catatan.</small>'}</div></div>`;
    if ($("#hs")) $("#hs").innerHTML = table(hist.sales, { open: r => go(`doc/sale/${r.id}`) });
    if ($("#hi")) $("#hi").innerHTML = table(hist.invoices, { open: r => go(`doc/invoice/${r.id}`) });
}

/* ---------------- S-03 Product form ---------------- */
async function renderProduct(sku) {
    renderNav("inventory", "products"); crumb([["Apps", "home"], ["Products", "inventory/products"], [sku]]);
    const [ps, st] = await Promise.all([api("/masters/products"), can("inventory.view") ? api("/stock") : Promise.resolve([])]);
    const p = ps.find(x => x.sku === sku);
    heading("Product Variant", "Setiap ukuran/rasa memiliki variant SKU unik; stok tidak digabung antarkode SKU.");
    const rows = st.filter(x => x.sku === sku);
    $("#pageContent").innerHTML = `<div class="sheet"><div class="form-head"><div><small class="muted">SKU</small><h2>${esc(p.sku)}</h2></div></div>
      <div class="fields">${[["Name", p.name], ["Variant", `${p.size} / ${p.color}`], ["Unit", p.unit], ["Sales price", fmt(p.sales_price)],
        ["Standard cost", fmt(p.standard_cost)], ["Default vendor", p.default_vendor]].map(f => `<div class="f"><span>${f[0]}</span><span>${esc(f[1])}</span></div>`).join("")}</div>
      <h3 class="section-title">STOCK PER LOKASI</h3>${table(rows, { columns: ["warehouse_code", "on_hand", "reserved", "available", "stock_value"] })}
      <div class="chatter"><h3>Log Notes / Audit</h3>${(await api(`/history/${encodeURIComponent(sku)}`)).map(logRow).join("") || '<small class="muted">Belum ada catatan.</small>'}</div></div>`;
}

/* ---------------- Form view generik dokumen ---------------- */
const KIND_APP = { sale: ["sales", "quotations"], delivery: ["inventory", "deliveries"], invoice: ["invoicing", "invoices"],
    purchase: ["purchase", "purchase"], receipt: ["inventory", "receipts"], bill: ["accounting", "bills"], payment: ["invoicing", "payments"],
    transfer: ["inventory", "transfers"], return: ["inventory", "returns"], journal: ["accounting", "journals"], lead: ["crm", "pipeline"] };

async function renderDoc(kind, id) {
    const [app, page] = KIND_APP[kind] || ["home", ""];
    renderNav(app, page);
    let d;
    try { d = await api(`/doc/${kind}/${id}`); }
    catch (e) { crumb([["Apps", "home"], [kind]]); if (e.status === 403) return denied(e); throw e; }
    const listLabel = (MENUS[app] || []).find(x => x[0] === page)?.[1] || page;
    crumb([["Apps", "home"], [listLabel, `${app}/${page}`], [d.number]]);
    heading(d.title, "");
    const acts = docActions(d);
    const curIdx = d.steps.indexOf(d.current);
    const lines = d.lines && d.lines.rows ? table(d.lines.rows, { columns: d.lines.columns, empty: "Tidak ada baris." }) : "";
    $("#pageContent").innerHTML = `<div class="sheet">
      <div class="action-bar"><div class="acts">${acts.map((a, i) => `<button class="btn ${a.primary ? "primary" : ""}" data-act="${i}" title="${esc(a.title || "")}">${esc(a.label)}</button>`).join("") || '<span class="muted" style="font-size:12px">Tidak ada aksi untuk role/status ini.</span>'}</div>
        <div class="statusbar">${d.steps.map((s, i) => `<span class="${s === d.current ? "on" : (curIdx > i ? "done" : "")}">${esc(s)}</span>`).join("")}</div></div>
      <div class="smart">${(d.related || []).map((r, i) => `<button data-rel="${i}" class="${r.allowed ? "" : "locked"}" title="${r.allowed ? "" : "Tidak ada izin"}">↗ ${esc(r.label)}${r.status ? ` · ${esc(r.status)}` : ""}${r.allowed ? "" : " 🔒"}</button>`).join("") || '<small class="muted">Related Docs: —</small>'}</div>
      <div class="form-head"><div><small class="muted">${esc(d.title)}</small><h2>${esc(d.number)}</h2></div>${badge(d.status)}</div>
      <div class="fields">${d.fields.map(f => `<div class="f"><span>${esc(f[0])}</span><span>${typeof f[1] === "number" && isMoney(f[0].toLowerCase().replace(/ /g, "_")) ? fmt(f[1]) : (/ at$/i.test(f[0]) ? formatWIB(f[1]) : esc(f[1] ?? "—"))}</span></div>`).join("")}</div>
      ${d.reservations && d.reservations.length ? `<div class="hint-box">Reservasi aktif: ${d.reservations.filter(r => r.active).map(r => `${esc(r.sku)} × ${r.quantity} @ ${esc(r.warehouse_code)}`).join(", ") || "tidak ada (sudah terkirim/dilepas)"}</div>` : ""}
      ${lines}
      ${d.totals && d.totals.length ? `<div class="totals">${d.totals.map(t => `<div class="t"><span>${esc(t[0])}</span><span>${/unit|^inspected|^accepted$|^rejected$|^total unit|moves/i.test(t[0]) ? num(t[1]) : fmt(t[1])}</span></div>`).join("")}</div>` : ""}
      <div class="chatter"><h3>Log Notes / Audit History</h3>${(d.history || []).map(logRow).join("") || '<small class="muted">Belum ada catatan.</small>'}</div></div>`;
    $("#pageContent").querySelectorAll("[data-act]").forEach(b => b.onclick = () => runAct(acts[+b.dataset.act]));
    $("#pageContent").querySelectorAll("[data-rel]").forEach(b => b.onclick = () => go(`doc/${d.related[+b.dataset.rel].kind}/${d.related[+b.dataset.rel].id}`));
}
async function runAct(a) {
    if (a.confirm && !confirm(a.confirm)) return;
    try { const msg = await a.fn(); if (msg) notice(msg); route(); }
    catch (e) { await route(); notice(e.message, true); }
}
const again = "↻ Kirim ulang (uji idempotensi)";
function docActions(d) {
    const s = d.status, A = [], raw = d.raw || {};
    const add = (cond, label, fn, extra = {}) => cond && A.push({ label, fn, ...extra });
    if (d.kind === "sale") {
        add(s === "Pending Approval" && can("sales.approve"), "✓ Approve discount (Owner)", async () => { await post(`/sales-orders/${d.id}/approve-discount`); return "Diskon disetujui Owner; Quotation siap di-Confirm oleh Sales."; }, { primary: true });
        add(s === "Pending Approval" && can("sales.approve"), "✕ Reject discount", async () => { const n = prompt("Alasan penolakan:", "Diskon maksimal 10%"); if (n === null) return; await post(`/sales-orders/${d.id}/reject-discount`, { note: n }); return "Diskon ditolak; Sales perlu merevisi quotation."; });
        add(["Quotation", "Pending Approval"].includes(s) && can("sales.confirm"), "Confirm", async () => {
            const r = await post(`/sales-orders/${d.id}/confirm`); return `${r.number} Confirmed & stock reserved. Exposure ${fmt(r.exposure)}, headroom ${fmt(r.headroom)}.`; }, { primary: s === "Quotation" });
        add(can("sales.edit") && s !== "Cancelled", "✎ Edit harga / diskon", () => editSaleDialog(d), { title: "Setelah Confirmed backend menolak (SR-08)" });
        add(s === "Confirmed" && can("delivery.create"), "＋ Create Delivery", () => deliveryDialog(d.id));
        add(s === "Confirmed" && can("invoicing.post"), "＋ Create Invoice", () => invoiceDialog(d.id));
        add(s === "Confirmed" && can("sales.edit"), "Revisi (cancel & copy)", async () => { const r = await post(`/sales-orders/${d.id}/revise`); go(`doc/sale/${r.id}`); return `${r.cancelled} dibatalkan; revisi ${r.number} dibuat.`; }, { confirm: "Revisi membatalkan SO ini, melepas reservasi, dan membuat Quotation baru. Lanjut?" });
        add(["Quotation", "Pending Approval", "Confirmed"].includes(s) && can("sales.edit"), "Cancel", async () => { await post(`/sales-orders/${d.id}/cancel`); return "Dokumen dibatalkan."; }, { confirm: "Batalkan dokumen ini?" });
    }
    if (d.kind === "delivery") {
        add(s === "Ready" && can("delivery.validate"), "✓ Validate", async () => { const r = await post(`/deliveries/${d.id}/validate`); return `Delivery Done. COGS ${fmt(r.total_cogs)} · ${r.journal_number}`; }, { primary: true, confirm: "Validasi: On Hand berkurang, reservasi berkurang, jurnal COGS dibuat. Lanjut?" });
        add(s === "Done" && can("delivery.validate"), again, async () => { const r = await post(`/deliveries/${d.id}/validate`); return r.message || "Tidak ada perubahan."; });
    }
    if (d.kind === "invoice") {
        add(s === "Draft" && can("invoicing.post"), "Post", async () => { const r = await post(`/invoices/${d.id}/post`); return `Invoice Posted · ${r.journal_number}`; }, { primary: true });
        add(s === "Posted" && can("invoicing.post"), again, async () => { const r = await post(`/invoices/${d.id}/post`); return r.message || "Tidak ada perubahan."; });
        add(s === "Posted" && d.residual > 0 && can("payments.create"), "Register Payment", () => paymentDialog("customer", d), { primary: true });
        add(s === "Posted" && can("returns.create"), "＋ Return / Credit Note", () => returnDialog(d.id));
        add(true, "🖨 Cetak / PDF", () => { window.open(`/api/invoices/${d.id}/print`, "_blank"); });
    }
    if (d.kind === "purchase") {
        add(["RFQ", "Pending Approval"].includes(s) && can("purchase.confirm"), s === "RFQ" ? "Confirm Order" : "Confirm (coba)", async () => { const r = await post(`/purchase-orders/${d.id}/confirm`); return r.message || `PO ${r.status}.`; }, { primary: s === "RFQ" });
        add(s === "Pending Approval" && can("purchase.approve"), "✓ Approve (Owner)", async () => { await post(`/purchase-orders/${d.id}/approve`); return "PO disetujui Owner & Confirmed."; }, { primary: true });
        add(s === "Pending Approval" && can("purchase.approve"), "✕ Reject", async () => { const n = prompt("Alasan penolakan:", "Kurangi jumlah pembelian"); if (n === null) return; await post(`/purchase-orders/${d.id}/reject`, { note: n }); return "PO ditolak dan kembali menjadi RFQ."; });
        add(s === "Confirmed" && can("receipt.create"), "＋ Receive", () => receiptDialog(d.id), { primary: true });
        add(["RFQ", "Pending Approval"].includes(s) && can("purchase.create"), "Cancel", async () => { await post(`/purchase-orders/${d.id}/cancel`); return "PO dibatalkan."; }, { confirm: "Batalkan PO?" });
    }
    if (d.kind === "receipt") {
        add(["Waiting", "Quality Checked"].includes(s) && can("quality.check"), s === "Waiting" ? "Quality Check Pass / Fail" : "Koreksi QC", () => qcDialog(d), { primary: s === "Waiting" });
        add(s === "Quality Checked" && can("receipt.validate"), "✓ Validate (accepted only)", async () => { const r = await post(`/receipts/${d.id}/validate`); return `Receipt Done. Accepted value ${fmt(r.accepted_value)} masuk stock${r.journal_number ? " · " + r.journal_number : ""}.`; }, { primary: true });
        add(s === "Waiting" && can("receipt.validate"), "Validate (tanpa QC)", async () => { await post(`/receipts/${d.id}/validate`); });
        add(!can("quality.check") && s !== "Done", "Ubah accepted qty", () => overrideDialog(d), { title: "Uji T-22: diblokir backend" });
        add(s === "Done" && can("bills.post"), "＋ Create Vendor Bill", () => billDialog(d.id), { primary: true });
    }
    if (d.kind === "bill") {
        add(s === "Draft" && raw.match_status === "Mismatch" && can("bills.post"), "Resolve: tagih sebatas accepted", async () => { await post(`/vendor-bills/${d.id}/resolve`); return "Selisih ditandai; bill sebatas accepted qty."; });
        add(s === "Draft" && can("bills.post"), "Post", async () => { const r = await post(`/vendor-bills/${d.id}/post`); return `Vendor Bill Posted · ${r.journal_number}`; }, { primary: raw.match_status !== "Mismatch" });
        add(s === "Posted" && d.residual > 0 && can("payments.create"), "Register Payment", () => paymentDialog("vendor", d), { primary: true });
    }
    if (d.kind === "transfer") {
        add(s === "Ready" && can("transfer.validate"), "✓ Validate", async () => { await post(`/transfers/${d.id}/validate`); return "Transfer Done."; }, { primary: true });
        add(s === "Done" && can("transfer.validate"), again, async () => { const r = await post(`/transfers/${d.id}/validate`); return r.message; });
    }
    if (d.kind === "return") {
        add(["Requested", "Inspected"].includes(s) && can("returns.inspect"), s === "Requested" ? "Return Inspection (Quality)" : "Koreksi inspeksi", () => returnInspectDialog(d), { primary: s === "Requested" });
        add(s === "Inspected" && can("returns.receive"), "✓ Proses stock move retur", async () => { const r = await post(`/returns/${d.id}/receive`); return `Stock move retur dicatat · ${r.journal_number}`; }, { primary: true });
        add(s === "Received" && can("returns.validate"), "✓ Credit Note + AR adjustment", async () => { const r = await post(`/returns/${d.id}/validate`); return `Credit Note ${r.credit_note_number} dibuat · ${r.journals.join(", ")}`; }, { primary: true });
        add(s === "Done" && can("returns.validate"), again, async () => { const r = await post(`/returns/${d.id}/validate`); return r.message; });
    }
    if (d.kind === "lead") {
        ["Qualified", "Proposition", "Won", "Lost"].filter(x => x !== s && can("crm.edit")).forEach(x =>
            A.push({ label: `→ ${x}`, fn: async () => { await post(`/leads/${d.id}/stage`, { stage: x }); return `Stage ${x}. Ledger & revenue tidak berubah.`; } }));
        add(can("crm.create"), "＋ Log activity", () => activityDialog(d));
        add(!raw.quotation_id && can("sales.create"), "＋ Convert to Quotation", async () => { const r = await post(`/leads/${d.id}/quotation`); go(`doc/sale/${r.id}`); return `Quotation ${r.number} dibuat (tanpa jurnal).`; }, { primary: true });
    }
    return A;
}

/* ---------------- Dialogs ---------------- */
let MASTER = null;
async function masters() { if (!MASTER) { const [ps, cs] = await Promise.all([api("/masters/products"), can("contacts.view") ? api("/masters/customers") : []]); MASTER = { ps, cs }; } return MASTER; }
function lineEditor(ps, withPrice, initial) {
    const opt = s => `<option value="" ${s ? "" : "selected"} disabled>— Pilih produk —</option>` + ps.map(p => `<option value="${esc(p.sku)}" ${p.sku === s ? "selected" : ""}>${esc(p.sku)} · ${esc(p.name)} ${esc(p.size)} (${fmt(withPrice === "cost" ? p.standard_cost : p.sales_price)})</option>`).join("");
    const row = l => `<tr><td><select class="le-sku">${opt(l.sku)}</select></td><td style="width:90px"><input class="le-qty" type="number" min="1" value="${l.quantity || 1}"></td>
        ${withPrice ? `<td style="width:130px"><input class="le-price" type="number" min="0" placeholder="default" value="${l.price ?? ""}"></td>` : ""}<td style="width:40px"><button class="btn le-del">✕</button></td></tr>`;
    const id = "le" + Math.random().toString(36).slice(2);
    setTimeout(() => {
        const t = document.getElementById(id); if (!t) return;
        const bind = () => t.querySelectorAll(".le-del").forEach(b => b.onclick = () => { if (t.querySelectorAll("tbody tr").length > 1) b.closest("tr").remove(); });
        t.querySelector(".le-add").onclick = () => { t.querySelector("tbody").insertAdjacentHTML("beforeend", row({})); bind(); };
        bind();
    });
    return `<div id="${id}"><table class="line-editor"><thead><tr><th>Product</th><th>Qty</th>${withPrice ? `<th>${withPrice === "cost" ? "Unit cost" : "Unit price"}</th>` : ""}<th></th></tr></thead>
      <tbody>${(initial && initial.length ? initial : [{}]).map(row).join("")}</tbody></table><button class="btn le-add" style="margin-top:8px">＋ Add a line</button></div>`;
}
function readLines(m, priceKey) {
    return [...m.querySelectorAll(".line-editor tbody tr")].map(tr => {
        if (!tr.querySelector(".le-sku").value) throw Error("Pilih produk di setiap baris terlebih dahulu.");
        const l = { sku: tr.querySelector(".le-sku").value, quantity: +tr.querySelector(".le-qty").value };
        const p = tr.querySelector(".le-price"); if (p && p.value !== "") l[priceKey] = +p.value; return l;
    });
}
async function quotationDialog(customer) {
    const { ps, cs } = await masters();
    const m = openModal("New Quotation", `<div class="form-grid">
        <div><label>Customer</label><select id="q_c">${cs.map(c => `<option value="${c.code}" ${c.code === customer ? "selected" : ""}>${c.code} · ${esc(c.name)}</option>`).join("")}</select></div>
        <div><label>Warehouse</label><select id="q_w">${whOptions("WH-PKU")}</select></div>
        <div><label>Discount % (≤10% tanpa approval; maks 20%)</label><input id="q_d" type="number" value="0" min="0" max="20" step="0.5"></div>
        <div id="q_credit" class="hint-box"></div>
        <div class="wide">${lineEditor(ps, "price")}</div></div>
        <div class="hint-box">Harga sebelum pajak. PPN efektif 11% dihitung per baris (half-up). Quotation belum mereservasi stok dan belum menambah exposure sampai Confirmed.</div>`,
        async m => { const r = await post("/sales-orders", { customer_code: m.querySelector("#q_c").value, warehouse_code: m.querySelector("#q_w").value,
            discount_pct: +m.querySelector("#q_d").value, lines: readLines(m, "unit_price") }); go(`doc/sale/${r.id}`);
            return `${r.number} dibuat: net ${fmt(r.subtotal)} · PPN ${fmt(r.tax)} · total ${fmt(r.total)}.` +
                (r.status === "Pending Approval" ? ` Diskon efektif ${r.effective_discount}% > 10% — otomatis diajukan ke Owner (lihat menu Approvals).` : ""); }, "Create Quotation");
    const showCredit = async () => { const ci = await api(`/contacts/${m.querySelector("#q_c").value}/credit`);
        m.querySelector("#q_credit").innerHTML = `Exposure ${fmt(ci.exposure)} · limit ${fmt(ci.credit_limit)} · headroom <b>${fmt(ci.headroom)}</b>`; };
    m.querySelector("#q_c").onchange = showCredit; showCredit();
}
async function editSaleDialog(d) {
    const { ps } = await masters();
    openModal(`Edit ${d.number}`, `<div class="form-grid"><div><label>Discount %</label><input id="e_d" type="number" value="${d.raw.discount_pct}" min="0" max="20" step="0.5"></div><div></div>
      <div class="wide">${lineEditor(ps, "price", d.lines.rows.map(l => ({ sku: l.sku, quantity: l.ordered_qty, price: l.unit_price })))}</div></div>
      <div class="hint-box">Dokumen Confirmed terkunci: backend akan menolak perubahan dan mencatat percobaan di audit (SR-08).</div>`,
        async m => { const r = await api(`/sales-orders/${d.id}`, { method: "PUT", body: JSON.stringify({ discount_pct: +m.querySelector("#e_d").value, lines: readLines(m, "unit_price") }) });
            return r.status === "Pending Approval" ? `Diskon efektif ${r.effective_discount}% > 10% — otomatis diajukan ke Owner untuk approval.` : "Quotation diperbarui."; }, "Save");
}
async function leadDialog() {
    const { ps, cs } = await masters();
    openModal("New Lead", `<div class="form-grid"><div class="wide"><label>Title</label><input id="l_t" placeholder="Prospek …"></div>
      <div><label>Customer</label><select id="l_c">${cs.map(c => `<option value="${c.code}">${c.code} · ${esc(c.name)}</option>`).join("")}</select></div>
      <div><label>Expected SKU</label><select id="l_s">${ps.map(p => `<option>${p.sku}</option>`).join("")}</select></div>
      <div><label>Expected qty</label><input id="l_q" type="number" value="1" min="1"></div></div>`,
        async m => { const r = await post("/leads", { title: m.querySelector("#l_t").value, customer_code: m.querySelector("#l_c").value,
            expected_sku: m.querySelector("#l_s").value, expected_qty: +m.querySelector("#l_q").value }); return `Lead ${r.number} dibuat.`; });
}
async function productDialog() {
    openModal("New Variant SKU", `<div class="form-grid"><div><label>SKU</label><input id="p_sku" placeholder="BVG-500-LEM"></div><div><label>Name</label><input id="p_n"></div>
      <div><label>Size</label><input id="p_s" placeholder="500 ml"></div><div><label>Color</label><input id="p_c"></div>
      <div><label>Unit</label><input id="p_u" value="botol"></div><div><label>Default vendor</label><input id="p_v" placeholder="V01"></div>
      <div><label>Sales price</label><input id="p_p" type="number"></div><div><label>Standard cost</label><input id="p_k" type="number"></div></div>
      <div class="hint-box">SKU wajib unik per ukuran/rasa (SR-17). SKU yang sudah ada akan ditolak.</div>`,
        async m => { const v = k => m.querySelector(k).value; const r = await post("/masters/products", { sku: v("#p_sku"), name: v("#p_n"), size: v("#p_s"), color: v("#p_c"),
            unit: v("#p_u"), default_vendor: v("#p_v") || null, sales_price: +v("#p_p"), standard_cost: +v("#p_k") }); MASTER = null; return `SKU ${r.sku} dibuat.`; });
}
async function deliveryDialog(oid) {
    const orders = await api("/sales-orders/for-delivery");
    if (!orders.length) return notice("Tidak ada Sales Order Confirmed yang memiliki sisa barang untuk dikirim.", true);
    const m = openModal("Create Delivery Order", `<label>Sales Order Confirmed</label><select id="d_o">${orders.map(o => `<option value="${o.id}" ${o.id === oid ? "selected" : ""}>${o.number} — ${esc(o.customer_name)} (${o.warehouse_code})</option>`).join("")}</select><div id="d_l"></div>`,
        async m => { const o = orders.find(x => String(x.id) === m.querySelector("#d_o").value); const q = {};
            o.lines.forEach(l => { const v = +m.querySelector(`[data-sku="${l.sku}"]`).value; if (v) q[l.sku] = v; });
            const r = await post(`/sales-orders/${o.id}/delivery`, { quantities: q }); go(`doc/delivery/${r.id}`); return `Delivery ${r.number} dibuat (Ready).`; }, "Create");
    const show = () => { const o = orders.find(x => String(x.id) === m.querySelector("#d_o").value);
        m.querySelector("#d_l").innerHTML = `<table class="line-editor"><thead><tr><th>SKU</th><th>Dipesan</th><th>Terkirim</th><th>Backorder</th><th>Available</th><th>Kirim sekarang</th></tr></thead><tbody>${o.lines.map(l => {
            const max = l.remaining_qty - l.pending_ready_qty; return `<tr><td><b>${esc(l.sku)}</b><br><small>${esc(l.product_name)}</small></td><td>${l.ordered_qty}</td><td>${l.delivered_qty}</td><td>${l.remaining_qty}</td><td>${l.available}</td>
            <td><input type="number" data-sku="${esc(l.sku)}" min="0" max="${max}" value="${max}"></td></tr>`; }).join("")}</tbody></table>
            <div class="hint-box">Ubah kuantitas untuk partial delivery; sisanya otomatis menjadi backorder.</div>`; };
    m.querySelector("#d_o").onchange = show; show();
}
async function invoiceDialog(oid) {
    const orders = (await api("/sales-orders/for-invoice"));
    if (!orders.length) return notice("Tidak ada Sales Order Confirmed.", true);
    const m = openModal("Create Customer Invoice", `<label>Sales Order</label><select id="i_o">${orders.map(o => `<option value="${o.id}" ${o.id === oid ? "selected" : ""}>${o.number} — ${esc(o.customer_name)} · invoiceable ${o.invoiceable_qty} unit</option>`).join("")}</select><div id="i_l"></div>`,
        async m => { const id = m.querySelector("#i_o").value; const o = orders.find(x => String(x.id) === id); const q = {};
            o.lines.forEach(l => { const v = m.querySelector(`[data-sku="${l.sku}"]`).value; if (v !== "") q[l.sku] = +v; });
            const r = await post(`/invoices/from-order/${id}`, { quantities: q }); go(`doc/invoice/${r.id}`); return `Invoice ${r.number} (Draft) · net ${fmt(r.net)} · PPN ${fmt(r.tax)} · total ${fmt(r.total)}.`; }, "Create Draft");
    const show = () => { const o = orders.find(x => String(x.id) === m.querySelector("#i_o").value);
        m.querySelector("#i_l").innerHTML = `<table class="line-editor"><thead><tr><th>SKU</th><th>Ordered</th><th>Delivered (Done)</th><th>Sudah ditagih</th><th>Invoiceable</th><th>Qty invoice</th></tr></thead><tbody>${o.lines.map(l =>
            `<tr><td>${esc(l.sku)}</td><td>${l.ordered_qty}</td><td>${l.delivered_qty}</td><td>${l.invoiced_qty + l.draft_invoiced_qty}</td><td><b>${l.invoiceable_qty}</b></td>
             <td><input type="number" data-sku="${esc(l.sku)}" min="0" value="${l.invoiceable_qty}"></td></tr>`).join("")}</tbody></table>
            <div class="hint-box">Invoice dibatasi delivered quantity yang belum ditagih (SR-02). Mengisi lebih besar akan ditolak server.</div>`; };
    m.querySelector("#i_o").onchange = show; show();
}
function paymentDialog(type, d) {
    openModal("Register Payment", `<div class="form-grid"><div><label>Document</label><input value="${esc(d.number)}" disabled></div>
      <div><label>Amount Due</label><input value="${fmt(d.residual)}" disabled></div><div><label>Payment Amount (IDR)</label><input id="pay_a" type="number" value="${d.residual}"></div>
      <div><label>Journal</label><input value="Bank (1010)" disabled></div></div><div class="hint-box">Harus positif dan ≤ residual (SR-10). Status Partial/Paid ditentukan residual.</div>`,
        async m => { const r = await post("/payments", { document_type: type, document_id: d.id, amount: +m.querySelector("#pay_a").value });
            return `${r.number}: residual ${fmt(r.residual)} · status ${r.status} · ${r.journal_number}`; }, "Create Payment");
}
async function poDialog() {
    const [vs, { ps }] = await Promise.all([api("/masters/vendors"), masters()]);
    openModal("New RFQ", `<div class="form-grid"><div><label>Vendor</label><select id="po_v">${vs.map(v => `<option value="${v.code}">${v.code} · ${esc(v.name)}</option>`).join("")}</select></div>
      <div><label>Currency</label><input value="IDR" disabled></div><div class="wide">${lineEditor(ps, "cost")}</div></div>
      <div class="hint-box">Unit cost kosong = harga vendor pricelist. Subtotal &gt; Rp1.000.000 → Pending Approval Owner (SR-20). RFQ tidak mengubah stok.</div>`,
        async m => { const r = await post("/purchase-orders", { vendor_code: m.querySelector("#po_v").value, lines: readLines(m, "unit_cost") }); go(`doc/purchase/${r.id}`);
            return `${r.number}: subtotal ${fmt(r.subtotal)} · gross ${fmt(r.total)}.`; }, "Create RFQ");
}
async function receiptDialog(poid) {
    const pos = (await api("/documents/purchase")).filter(p => p.status === "Confirmed");
    if (!pos.length) return notice("Tidak ada PO Confirmed.", true);
    const m = openModal("Receive Products", `<label>Purchase Order</label><select id="r_p">${pos.map(p => `<option value="${p.id}" ${p.id === poid ? "selected" : ""}>${p.number} · ${esc(p.vendor)}</option>`).join("")}</select>
      <label>Warehouse</label><select id="r_w">${whOptions("WH-PKU")}</select><div id="r_l"></div>`,
        async m => { const lines = [...m.querySelectorAll("[data-sku]")].map(i => { const tr = i.closest("tr");
                return { sku: i.dataset.sku, received_qty: +i.value, lot_number: tr.querySelector(".r_lot")?.value || "", expiry_date: tr.querySelector(".r_exp")?.value || "" }; });
            const r = await post(`/purchase-orders/${m.querySelector("#r_p").value}/receipt`, { warehouse_code: m.querySelector("#r_w").value, lines });
            go(`doc/receipt/${r.id}`); return `Receipt ${r.number} dibuat — menunggu Quality Check.`; }, "Create Receipt");
    const show = async () => { const po = await api(`/doc/purchase/${m.querySelector("#r_p").value}`);
        const lot = can("lots.manage");
        m.querySelector("#r_l").innerHTML = `<table class="line-editor"><thead><tr><th>SKU</th><th>Ordered</th><th>Sudah diterima</th><th>Diterima sekarang</th>${lot ? "<th>Lot</th><th>Expiry</th>" : ""}</tr></thead><tbody>${po.lines.rows.map(l =>
            `<tr><td>${esc(l.sku)}</td><td>${l.quantity}</td><td>${l.received_qty}</td><td><input type="number" data-sku="${esc(l.sku)}" min="0" value="${l.quantity - l.received_qty}"></td>
             ${lot ? `<td><input class="r_lot" placeholder="LOT-001"></td><td><input class="r_exp" type="date"></td>` : ""}</tr>`).join("")}</tbody></table>
            <div class="hint-box">Accepted/rejected diisi oleh Quality. Kelebihan dari qty PO ditolak (ajukan revisi PO).</div>`; };
    m.querySelector("#r_p").onchange = show; show();
}
function qcDialog(d) {
    openModal(`Quality Check — ${d.number}`, `<table class="line-editor"><thead><tr><th>SKU</th><th>Inspected</th><th>Pass</th><th>Fail</th><th>Fail reason</th></tr></thead><tbody>${d.lines.rows.map(l =>
        `<tr data-sku="${esc(l.sku)}"><td>${esc(l.sku)}</td><td>${l.inspected}</td><td><input class="qp" type="number" min="0" value="${d.status === "Waiting" ? l.inspected : l.accepted}"></td>
         <td><input class="qf" type="number" min="0" value="${d.status === "Waiting" ? 0 : l.rejected}"></td><td><input class="qr" value="${esc(l.fail_reason || "")}" placeholder="Segel rusak"></td></tr>`).join("")}</tbody></table>
      <div class="hint-box">Inspector: ${esc(ME.user.name)}. Pass + Fail = inspected. Koreksi QC tercatat di audit dengan nilai sebelum/sesudah.</div>`,
        async m => { const lines = [...m.querySelectorAll("tr[data-sku]")].map(tr => ({ sku: tr.dataset.sku, passed: +tr.querySelector(".qp").value,
            failed: +tr.querySelector(".qf").value, reason: tr.querySelector(".qr").value }));
            const r = await post(`/receipts/${d.id}/quality-check`, { lines }); return `${r.qc_number} tersimpan. Warehouse dapat memvalidasi unit accepted.`; }, "Save QC");
}
function overrideDialog(d) {
    openModal(`Ubah accepted qty — ${d.number}`, `<table class="line-editor"><thead><tr><th>SKU</th><th>Inspected</th><th>Accepted (QC)</th><th>Accepted baru</th></tr></thead><tbody>${d.lines.rows.map(l =>
        `<tr><td>${esc(l.sku)}</td><td>${l.inspected}</td><td>${l.accepted}</td><td><input type="number" data-sku="${esc(l.sku)}" value="${l.inspected}"></td></tr>`).join("")}</tbody></table>
      <div class="hint-box">Hanya Quality yang boleh mengubah hasil Pass/Fail. Percobaan ini akan ditolak dan dicatat.</div>`,
        async m => { await api(`/receipts/${d.id}/lines`, { method: "PATCH", body: JSON.stringify({ lines: [...m.querySelectorAll("[data-sku]")].map(i => ({ sku: i.dataset.sku, accepted_qty: +i.value })) }) }); }, "Submit");
}
async function billDialog(rid) {
    const recs = (await api("/documents/receipts")).filter(r => r.status === "Done");
    if (!recs.length) return notice("Belum ada Receipt Done.", true);
    const m = openModal("Create Vendor Bill (three-way match)", `<label>Receipt</label><select id="b_r">${recs.map(r => `<option value="${r.id}" ${r.id === rid ? "selected" : ""}>${r.number} · ${r.purchase_order} · accepted ${r.accepted}</option>`).join("")}</select><div id="b_l"></div>`,
        async m => { const claimed = {}; m.querySelectorAll("[data-sku]").forEach(i => claimed[i.dataset.sku] = +i.value);
            const r = await post(`/vendor-bills/from-receipt/${m.querySelector("#b_r").value}`, { claimed }); go(`doc/bill/${r.id}`);
            return r.idempotent ? r.message : `${r.number}: ${r.match_status}. Net ${fmt(r.net)} · PPN ${fmt(r.tax)} · total ${fmt(r.total)}.`; }, "Create Bill");
    const show = async () => { const d = await api(`/doc/receipt/${m.querySelector("#b_r").value}`);
        m.querySelector("#b_l").innerHTML = `<table class="line-editor"><thead><tr><th>SKU</th><th>Ordered</th><th>Accepted</th><th>Qty ditagih vendor</th></tr></thead><tbody>${d.lines.rows.map(l =>
            `<tr><td>${esc(l.sku)}</td><td>${l.ordered_qty}</td><td>${l.accepted}</td><td><input type="number" data-sku="${esc(l.sku)}" value="${l.accepted}"></td></tr>`).join("")}</tbody></table>
            <div class="hint-box">Bill hanya membukukan accepted qty. Bila vendor menagih lebih, selisih ditandai dan posting ditahan.</div>`; };
    m.querySelector("#b_r").onchange = show; show();
}
async function transferDialog() {
    const { ps } = await masters();
    openModal("Internal Transfer", `<div class="form-grid"><div><label>SKU</label><select id="t_s">${ps.map(p => `<option>${p.sku}</option>`).join("")}</select></div>
      <div><label>Quantity</label><input id="t_q" type="number" min="1" value="1"></div><div><label>From</label><select id="t_f">${whOptions("WH-PKU")}</select></div>
      <div><label>To</label><select id="t_t">${whOptions("OUT-MRP")}</select></div></div>`,
        async m => { const r = await post("/transfers", { sku: m.querySelector("#t_s").value, quantity: +m.querySelector("#t_q").value,
            from_warehouse: m.querySelector("#t_f").value, to_warehouse: m.querySelector("#t_t").value }); go(`doc/transfer/${r.id}`); return `${r.number} dibuat (Ready). Tekan Validate untuk memindahkan stok.`; }, "Create");
}
async function returnDialog(iid) {
    const invs = (await api("/documents/invoices")).filter(i => i.status === "Posted");
    if (!invs.length) return notice("Belum ada invoice Posted.", true);
    const m = openModal("Customer Return", `<div class="form-grid"><div class="wide"><label>Invoice</label><select id="rt_i">${invs.map(i => `<option value="${i.id}" ${i.id === iid ? "selected" : ""}>${i.number} · ${esc(i.customer)} · ${fmt(i.total)}</option>`).join("")}</select></div>
      <div><label>SKU</label><select id="rt_s"></select></div><div><label>Return quantity</label><input id="rt_q" type="number" min="1" value="1"></div>
      <div class="wide"><label>Alasan retur dari pelanggan</label><input id="rt_r" placeholder="Salah kirim / kemasan rusak"></div></div>
      <div class="hint-box">Alur: Sales mengajukan → Quality memeriksa (Saleable/Damaged) → Warehouse memproses stock move → Finance membuat Credit Note & penyesuaian AR.</div>`,
        async m => { const r = await post("/returns", { invoice_id: +m.querySelector("#rt_i").value, sku: m.querySelector("#rt_s").value, quantity: +m.querySelector("#rt_q").value,
            reason: m.querySelector("#rt_r").value }); go(`doc/return/${r.id}`);
            return `${r.number}: credit net ${fmt(r.credit_net)} + PPN ${fmt(r.credit_tax)} = ${fmt(r.credit_total)}; COGS reversal ${fmt(r.cogs_reversal)}.`; }, "Request Return");
    const show = async () => { const d = await api(`/doc/invoice/${m.querySelector("#rt_i").value}`);
        m.querySelector("#rt_s").innerHTML = d.lines.rows.map(l => `<option>${esc(l.sku)}</option>`).join(""); };
    m.querySelector("#rt_i").onchange = show; show();
}

/* ---------------- Fitur tambahan tim: analisis produk & profitabilitas customer ---------------- */
async function setMinimumStock() {
    const sku = prompt("Masukkan SKU produk:"); if (sku === null) return;
    const warehouse = prompt("Masukkan gudang: WH-PKU atau OUT-MRP"); if (warehouse === null) return;
    const input = prompt("Masukkan minimum stok:"); if (input === null) return;
    const minimum = Number(input);
    if (!sku.trim() || !["WH-PKU", "OUT-MRP"].includes(warehouse.trim().toUpperCase()) || input.trim() === "" || !Number.isSafeInteger(minimum) || minimum < 0)
        return notice("Data minimum stok tidak valid", true);
    try { await post("/products/reorder-point", { sku: sku.trim().toUpperCase(), warehouse_code: warehouse.trim().toUpperCase(), min_available: minimum }); notice("Minimum stok berhasil disimpan!"); route(); }
    catch (e) { notice(e.message, true); }
}
function productFinanceTable(rows) {
    return table(rows.map(p => {
        const saran = p.restock_recommendation ?? "Belum dapat dinilai";
        return { Produk: `${p.product} (${p.sku})`, Stok: `${p.available ?? 0} unit`, "Terkirim periode": `${p.total_sold_period ?? 0} unit`,
            "Est. Laba Kumulatif": p.estimated_gross_profit == null ? "Belum ada invoice" : fmt(p.estimated_gross_profit),
            "Status Stok": String(saran).toLowerCase().includes("minimum") ? "Minimum belum diatur" : (p.low_stock_locations && p.low_stock_locations !== "—" ? `Menipis: ${p.low_stock_locations}` : "Tidak ada alert"),
            Rekomendasi: saran };
    }));
}
async function productAnalysisPanels() {
    const [analysis, perf] = await Promise.all([api("/products/analysis"), api("/products/performance?days=30")]);
    const stockRows = analysis.map(p => ({ Produk: `${p.name} ${p.size || ""}`.trim(), SKU: p.sku, Gudang: p.warehouse_code, "On Hand": p.on_hand, Reserved: p.reserved,
        Tersedia: p.available, Minimum: p.min_available ?? "Belum diatur", Status: p.stock_status, "Nilai Stok": fmt(p.stock_value) }));
    return `<div class="panel"><h3>Product Stock Analysis</h3>${table(stockRows)}</div>
      <div class="panel"><h3>Product Performance — 30 Hari</h3>
        ${perf.has_delivery_history ? `<h4>Top 5 Best-Selling</h4>${productFinanceTable(perf.best_sellers)}<h4>Pengiriman terendah (perlu evaluasi)</h4>${productFinanceTable(perf.low_movement_products)}`
            : '<div class="empty">Belum ada Delivery Done dalam 30 hari terakhir.</div>'}
        <h4>Restock Recommendation</h4>${perf.restock_candidates.length ? productFinanceTable(perf.restock_candidates) : '<div class="empty">Belum ada kandidat restock.</div>'}
        <h4>All Product Performance</h4>${productFinanceTable(perf.products)}<p><small>${esc(perf.note)}</small></p></div>`;
}
async function profitabilityPanel() {
    const report = await api("/contacts/profitability"), s = report.summary;
    const view = rows => table(rows.map(c => ({ customer: `${c.customer_code} — ${c.customer_name}`, total_sales: c.net_sales, estimated_cogs: c.estimated_cogs,
        gross_profit: c.estimated_gross_profit, margin: c.estimated_margin_pct === null ? "—" : `${c.estimated_margin_pct}%`, outstanding_ar: c.outstanding_ar, profit_status: c.profit_status })));
    return `<div class="panel"><h3>Customer Profitability Analysis — Finance</h3><p class="muted">Berdasarkan Invoice Posted, bukan Sales Order.</p>
      <div class="grid">${metric("Customer", s.customer_count, "Total aktif")}${metric("Sudah ada invoice", s.customers_with_posted_invoice, "Invoice Posted")}
      ${metric("Total Piutang", fmt(s.total_outstanding_ar), "Saldo awal + invoice belum lunas")}${metric("Est. Laba Kotor", s.total_estimated_gross_profit === null ? "Belum ada data" : fmt(s.total_estimated_gross_profit), "Sebelum biaya operasional")}</div>
      <h4>Customer paling menguntungkan</h4>${report.most_profitable.length ? view(report.most_profitable) : '<div class="empty">Belum ada.</div>'}
      <h4>Customer merugikan (estimasi)</h4>${report.loss_making.length ? view(report.loss_making) : '<div class="empty">Belum ada.</div>'}
      <h4>Semua customer</h4>${view(report.customers)}<p><small>${esc(report.note)}</small></p></div>`;
}

/* ---------------- Dialog tambahan: contacts, CRM activity, return inspection ---------------- */
function customerDialog(c) {
    const v = k => esc(c?.[k] ?? "");
    openModal(c ? `Edit ${c.code}` : "New Customer", `<div class="form-grid">
      <div><label>Code</label><input id="cu_code" value="${v("code")}" ${c ? "disabled" : ""} placeholder="C07"></div><div><label>Name</label><input id="cu_name" value="${v("name")}"></div>
      <div><label>Type</label><input id="cu_type" value="${v("type") || "Business"}"></div><div><label>City</label><input id="cu_city" value="${v("city")}"></div>
      <div><label>Contact person</label><input id="cu_cp" value="${v("contact_person")}"></div><div><label>Phone</label><input id="cu_ph" value="${v("phone")}"></div>
      <div><label>Email</label><input id="cu_em" value="${v("email")}"></div><div><label>Address</label><input id="cu_ad" value="${v("address")}"></div></div>
      <div class="hint-box">Credit limit & payment terms diatur oleh Finance (F-02). Customer baru mulai dengan limit Rp0 / COD.</div>`,
        async m => { const g = k => m.querySelector(k).value; const data = { name: g("#cu_name"), type: g("#cu_type"), city: g("#cu_city"),
            contact_person: g("#cu_cp"), phone: g("#cu_ph"), email: g("#cu_em"), address: g("#cu_ad") };
            if (c) await api(`/customers/${c.code}`, { method: "PUT", body: JSON.stringify(data) }); else await post("/customers", { code: g("#cu_code"), ...data });
            MASTER = null; return c ? "Data customer diperbarui." : "Customer baru dibuat."; });
}
function termsDialog(c) {
    openModal(`Credit terms — ${c.code}`, `<div class="form-grid"><div><label>Credit limit (IDR)</label><input id="ct_l" type="number" value="${c.credit_limit}"></div>
      <div><label>Payment terms</label><input id="ct_t" value="${esc(c.payment_terms)}" placeholder="NET14 / COD"></div></div>`,
        async m => { await api(`/customers/${c.code}/terms`, { method: "PUT", body: JSON.stringify({ credit_limit: +m.querySelector("#ct_l").value, payment_terms: m.querySelector("#ct_t").value }) });
            return "Credit terms diperbarui dan tercatat di audit."; });
}
function vendorDialog(vd) {
    document.querySelector(".modal-backdrop")?.remove();
    const v = k => esc(vd?.[k] ?? "");
    openModal(vd ? `Edit ${vd.code}` : "New Vendor", `<div class="form-grid">
      <div><label>Code</label><input id="ve_code" value="${v("code")}" ${vd ? "disabled" : ""} placeholder="V05"></div><div><label>Name</label><input id="ve_name" value="${v("name")}"></div>
      <div><label>City</label><input id="ve_city" value="${v("city")}"></div><div><label>Payment terms</label><input id="ve_pt" value="${v("payment_terms") || "NET14"}"></div>
      <div><label>Tax status</label><input id="ve_tx" value="${v("tax_status") || "PKP"}"></div><div><label>Contact person</label><input id="ve_cp" value="${v("contact_person")}"></div>
      <div><label>Phone</label><input id="ve_ph" value="${v("phone")}"></div><div><label>Email</label><input id="ve_em" value="${v("email")}"></div></div>`,
        async m => { const g = k => m.querySelector(k).value; const data = { name: g("#ve_name"), city: g("#ve_city"), payment_terms: g("#ve_pt"), tax_status: g("#ve_tx"),
            contact_person: g("#ve_cp"), phone: g("#ve_ph"), email: g("#ve_em") };
            if (vd) await api(`/vendors/${vd.code}`, { method: "PUT", body: JSON.stringify(data) }); else await post("/vendors", { code: g("#ve_code"), ...data });
            return vd ? "Vendor diperbarui." : "Vendor baru dibuat."; });
}
async function priceDialog(vs) {
    const { ps } = await masters();
    openModal("Harga beli vendor", `<div class="form-grid"><div><label>Vendor</label><select id="pr_v">${vs.map(v => `<option>${esc(v.code)}</option>`).join("")}</select></div>
      <div><label>SKU</label><select id="pr_s">${ps.map(p => `<option>${esc(p.sku)}</option>`).join("")}</select></div><div><label>Purchase price</label><input id="pr_p" type="number"></div></div>`,
        async m => { await api(`/vendors/${m.querySelector("#pr_v").value}/pricelist`, { method: "PUT", body: JSON.stringify({ sku: m.querySelector("#pr_s").value, purchase_price: +m.querySelector("#pr_p").value }) }); return "Pricelist diperbarui."; });
}
function activityDialog(d) {
    openModal(`Activity — ${d.number}`, `<div class="form-grid"><div><label>Jenis</label><select id="ac_t"><option>Call</option><option>Meeting</option><option>Email</option><option>Visit</option><option>Note</option></select></div>
      <div class="wide"><label>Ringkasan</label><input id="ac_s" placeholder="Telepon PIC, minta penawaran 30 botol"></div></div>`,
        async m => { await post(`/leads/${d.id}/activity`, { activity_type: m.querySelector("#ac_t").value, summary: m.querySelector("#ac_s").value }); return "Aktivitas dicatat."; });
}
function returnInspectDialog(d) {
    openModal(`Return Inspection — ${d.number}`, `<div class="form-grid"><div><label>Hasil inspeksi</label><select id="ri_x"><option>Saleable</option><option>Damaged</option></select></div>
      <div class="wide"><label>Catatan kondisi</label><input id="ri_n" placeholder="Segel utuh / botol penyok"></div></div>
      <div class="hint-box">Saleable: stok kembali & COGS dibalik saat Warehouse memproses. Damaged: tidak masuk stok, biaya ke 6100 Quality Loss.</div>`,
        async m => { const r = await post(`/returns/${d.id}/inspect`, { inspection: m.querySelector("#ri_x").value, note: m.querySelector("#ri_n").value }); return `Hasil inspeksi: ${r.inspection}. Lanjut ke Warehouse.`; }, "Save inspection");
}

/* ---------------- Inventory: lots & warehouses · Accounting: financial reports ---------------- */
PAGES.lots = {
    sub: "F-23: lot & expiry dicatat Warehouse saat receipt, diinspeksi Quality; delivery memakai lot expiry terdekat (FEFO).",
    async render(el) {
        const rows = await api("/lots");
        listView(el, { rows, statusKey: "expiry_status", groupBy: ["sku", "warehouse_code", "status"],
            columns: ["lot_number", "sku", "product", "warehouse_code", "expiry_date", "days_to_expiry", "received_qty", "remaining_qty", "status", "expiry_status", "receipt", "inspection_note"],
            empty: "Belum ada lot. Isi Lot & Expiry saat Receive dari PO.",
            open: can("lots.inspect") ? r => openModal(`Inspect lot ${r.lot_number}`, `<div class="form-grid"><div><label>Status</label><select id="li_s"><option ${r.status === "Released" ? "selected" : ""}>Released</option><option ${r.status === "Hold" ? "selected" : ""}>Hold</option></select></div>
                <div class="wide"><label>Catatan</label><input id="li_n" value="${esc(r.inspection_note || "")}"></div></div><div class="hint-box">Lot Hold tidak dipakai FEFO saat delivery.</div>`,
                async m => { await post(`/lots/${r.id}/inspect`, { status: m.querySelector("#li_s").value, note: m.querySelector("#li_n").value }); return "Status lot diperbarui."; }) : null });
    }
};
PAGES.warehouses = {
    sub: "Lokasi penyimpanan; setiap lokasi otomatis punya baris stok per SKU.",
    async render(el) {
        const rows = await api("/masters/warehouses");
        actions([can("warehouses.manage") && { label: "＋ New Location", primary: true, fn: () => openModal("New Warehouse / Location",
            `<div class="form-grid"><div><label>Code</label><input id="wh_c" placeholder="WH-DMI"></div><div><label>Name</label><input id="wh_n"></div>
             <div><label>City</label><input id="wh_city"></div><div><label>Type</label><input id="wh_t" value="Internal Warehouse"></div></div>`,
            async m => { await post("/warehouses", { code: m.querySelector("#wh_c").value, name: m.querySelector("#wh_n").value, city: m.querySelector("#wh_city").value, type: m.querySelector("#wh_t").value });
                WAREHOUSES = await api("/masters/warehouses"); return "Lokasi baru dibuat."; }) }]);
        el.innerHTML = table(rows);
    }
};
PAGES.reports = {
    sub: "Laba Rugi dan Neraca dihitung langsung dari journal posted.",
    async render(el) {
        const r = await api("/accounting/financial-reports");
        const block = (title, rows, total) => `<div class="panel"><h3>${title}</h3><div class="totals" style="width:100%;margin:0">${rows.map(x => `<div class="t"><span>${esc(x[0])}</span><span>${fmt(x[1])}</span></div>`).join("")}${total ? `<div class="t"><span>${total[0]}</span><span>${fmt(total[1])}</span></div>` : ""}</div></div>`;
        el.innerHTML = `<div class="dash-grid">${block("Profit & Loss", r.profit_loss)}
          <div>${block("Assets", r.assets, ["Total Assets", r.total_assets])}${block("Liabilities", r.liabilities)}${block("Equity", r.equity, ["Total Liabilities + Equity", r.total_liabilities_equity])}</div></div>
          <div class="hint-box">${r.balanced ? "✓ Neraca seimbang (Assets = Liabilities + Equity)." : "⚠ Neraca tidak seimbang — periksa jurnal."}</div>`;
    }
};

/* ---------------- Master Admin: users, roles & permissions, logs ---------------- */
PAGES.users = {
    sub: "Buat, edit, aktif/nonaktifkan akun dan assign role. Admin tidak melakukan transaksi bisnis.",
    async render(el) {
        const [rows, roles] = await Promise.all([api("/admin/users"), api("/admin/roles")]);
        actions([{ label: "＋ Create User", primary: true, fn: () => userDialog(null, roles) }]);
        listView(el, { rows: rows.map(u => ({ ...u, status: u.active ? "Active" : "Inactive" })), groupBy: ["role", "level", "status"],
            columns: ["username", "full_name", "role", "level", "status", "email", "last_login", "created_by"],
            open: u => userDialog(u, roles), kanban: { by: "role", card: u => `<b>${esc(u.full_name)}</b>${esc(u.username)} · ${badge(u.active ? "Active" : "Inactive")}` } });
    }
};
function userDialog(u, roles) {
    const v = k => esc(u?.[k] ?? "");
    const m = openModal(u ? `Edit user ${u.username}` : "Create User", `<div class="form-grid">
      <div><label>Username</label><input id="us_u" value="${v("username")}" ${u ? "disabled" : ""} placeholder="huruf kecil"></div><div><label>Full name</label><input id="us_n" value="${v("full_name")}"></div>
      <div><label>Email</label><input id="us_e" value="${v("email")}"></div><div><label>Phone</label><input id="us_p" value="${v("phone")}"></div>
      <div><label>Role</label><select id="us_r">${roles.map(r => `<option value="${esc(r.code)}" ${u?.role === r.code ? "selected" : ""}>${esc(r.name)} (${esc(r.code)})</option>`).join("")}</select></div>
      <div><label>Level</label><select id="us_l"><option ${u?.level === "Manager" ? "selected" : ""}>Manager</option><option ${!u || u.level === "Staff" ? "selected" : ""}>Staff</option></select></div>
      <div><label>${u ? "Reset password (opsional)" : "Password"}</label><input id="us_pw" type="password" placeholder="min. 6 karakter"></div></div>
      ${u ? `<div class="modal-actions" style="justify-content:flex-start"><button class="btn" id="us_toggle">${u.active ? "Deactivate account" : "Activate account"}</button><button class="btn" id="us_perm">⚙ Hak akses individu</button></div>` : ""}`,
        async m => { const g = k => m.querySelector(k).value; const data = { full_name: g("#us_n"), email: g("#us_e"), phone: g("#us_p"), role: g("#us_r"), level: g("#us_l") };
            if (g("#us_pw")) data.password = g("#us_pw");
            if (u) await api(`/admin/users/${u.id}`, { method: "PUT", body: JSON.stringify(data) }); else await post("/admin/users", { username: g("#us_u"), ...data });
            return u ? "User diperbarui." : "User baru dibuat."; });
    const pb = m.querySelector("#us_perm");
    if (pb) pb.onclick = () => { m.remove(); userPermDialog(u); };
    const tb = m.querySelector("#us_toggle");
    if (tb) tb.onclick = async () => { try { await post(`/admin/users/${u.id}/active`, { active: !u.active }); m.remove(); notice(u.active ? "Akun dinonaktifkan." : "Akun diaktifkan."); route(); }
        catch (e) { m.querySelector("#modalErr").innerHTML = `<div class="notice error">${esc(e.message)}</div>`; } };
}
PAGES.roles = {
    sub: "Atur akses modul per role: Create · Read · Update · Delete · Approve · Post. Perubahan langsung berlaku dan tercatat.",
    async render(el, app, code) {
        const [roles, cat] = await Promise.all([api("/admin/roles"), api("/admin/catalog")]);
        const cur = roles.find(r => r.code === code) || roles[0];
        actions([{ label: "＋ New Role", primary: true, fn: () => openModal("New Role", `<div class="form-grid"><div><label>Code</label><input id="ro_c" placeholder="Supervisor"></div>
            <div><label>Name</label><input id="ro_n"></div><div class="wide"><label>Description</label><input id="ro_d"></div>
            <div><label>Salin permission dari</label><select id="ro_f"><option value="">— kosong —</option>${roles.map(r => `<option>${esc(r.code)}</option>`).join("")}</select></div></div>`,
            async m => { const r = await post("/admin/roles", { code: m.querySelector("#ro_c").value, name: m.querySelector("#ro_n").value, description: m.querySelector("#ro_d").value, copy_from: m.querySelector("#ro_f").value });
                go(`admin/roles/${r.code}`); return "Role dibuat."; }) }]);
        const ACTIONS = ["Create", "Read", "Update", "Delete", "Approve", "Post"];
        const mods = [...new Set(cat.map(c => c.module))];
        const has = new Set(cur.permissions);
        el.innerHTML = `<div class="smart">${roles.map(r => `<button onclick="go('admin/roles/${esc(r.code)}')" class="${r.code === cur.code ? "on-role" : ""}">${esc(r.name)} · ${r.user_count} user</button>`).join("")}</div>
          <div class="sheet"><div class="form-head"><div><small class="muted">Role</small><h2>${esc(cur.name)} (${esc(cur.code)})</h2><p class="muted">${esc(cur.description || "")}</p></div>
            <div class="toolbar">${cur.is_system ? `<button class="btn" id="ro_reset">↺ Default matriks</button>` : `<button class="btn" id="ro_del">Hapus role</button>`}<button class="btn primary" id="ro_save">Simpan permission</button></div></div>
          <div class="table-wrap"><table class="perm-table"><thead><tr><th>Modul</th>${ACTIONS.map(a => `<th>${a}</th>`).join("")}</tr></thead><tbody>
          ${mods.map(mo => `<tr><td><b>${esc(mo)}</b></td>${ACTIONS.map(a => `<td>${cat.filter(c => c.module === mo && c.action === a).map(c =>
              `<label class="perm"><input type="checkbox" value="${esc(c.permission)}" ${has.has(c.permission) ? "checked" : ""}> ${esc(c.label)}</label>`).join("") || '<span class="muted">—</span>'}</td>`).join("")}</tr>`).join("")}
          </tbody></table></div></div>`;
        $("#ro_save").onclick = async () => { try { const r = await api(`/admin/roles/${cur.code}/permissions`, { method: "PUT", body: JSON.stringify({ permissions: [...el.querySelectorAll(".perm input:checked")].map(i => i.value) }) });
            notice(`Tersimpan: +${r.added.length} / −${r.removed.length} permission.`); route(); } catch (e) { notice(e.message, true); } };
        $("#ro_reset") && ($("#ro_reset").onclick = async () => { if (!confirm("Kembalikan ke matriks akses default?")) return; await post(`/admin/roles/${cur.code}/reset`); notice("Permission dikembalikan ke default."); route(); });
        $("#ro_del") && ($("#ro_del").onclick = async () => { if (!confirm("Hapus role ini?")) return; try { await api(`/admin/roles/${cur.code}`, { method: "DELETE" }); go("admin/roles"); } catch (e) { notice(e.message, true); } });
    }
};
/* ---------------- Owner Executive Dashboard ---------------- */
function exCard(k, cls = "") {
    const v = kpiValue(k), neg = k.kind === "money" && k.value < 0;
    return `<div class="ex-card ${cls} ${k.link ? "kpi" : ""}" ${k.link ? `onclick="go('${k.link}')"` : ""}>
      <div class="ex-val ${neg ? "txt-red" : ""}">${v}</div><div class="ex-lab">${esc(k.label)}</div><div class="ex-hint">${esc(k.hint)}</div></div>`;
}
function exPanel(icon, title, body, extra = "") {
    return `<div class="ex-panel ${extra}">${title ? `<h3 class="ex-title"><span class="ex-ic">${icon}</span>${esc(title)}</h3>` : ""}${body}</div>`;
}
function exTop(rows, emptyMsg) {
    if (!rows.length) return `<div class="ex-empty">${emptyMsg}</div>`;
    const max = Math.max(...rows.map(r => Math.abs(r.value)), 1);
    return `<div class="ex-top">${rows.map((r, i) => `<div class="ex-top-row"><span class="ex-rank">${i + 1}</span>
      <span class="ex-top-main"><b>${esc(r.label)}</b><span class="ex-top-track"><span class="${r.value < 0 ? "neg" : "pos"}" style="width:${Math.max(3, Math.abs(r.value) / max * 100)}%"></span></span></span>
      <span class="ex-top-val ${r.value < 0 ? "txt-red" : "txt-green"}">${fmt(r.value)}<small>margin ${r.margin}%</small></span></div>`).join("")}</div>`;
}
PAGES["owner-dashboard"] = {
    sub: "PT Segar Rasa Riau · setiap KPI dapat ditelusuri ke dokumen",
    async render(el) {
        heading("Owner Executive Dashboard", this.sub);
        actions([{ label: "↻ Refresh", fn: () => route() }, (can("sales.approve") || can("purchase.approve")) && { label: "⚙ Lihat Approvals", primary: true, fn: () => go("reporting/approvals") }]);
        const d = await api("/dashboard/executive");
        const [k1, k2] = [d.kpis.slice(0, 4), d.kpis.slice(4)];
        const cls = ["", "accent", "good", ""];
        const kpi = exPanel("📊", "Key Performance Indicators", `<div class="ex-grid4">${k1.map((k, i) => exCard(k, cls[i] + (i === 2 && k.value < 0 ? " bad" : ""))).join("")}</div>
          <div class="ex-grid4">${k2.map(k => exCard(k)).join("")}</div>`);
        const appr = exPanel("", "", d.approvals.length
            ? `<div class="ex-alert warn"><b>⚠ ${d.approvals.length} permintaan approval menunggu keputusan Owner</b></div>
               <div class="ex-appr">${d.approvals.map(a => `<a href="#doc/${a.kind}/${a.id}" class="ex-appr-row"><span class="badge">${esc(a.type)}</span>
                 <b>${esc(a.number)}</b><span>${esc(a.party)}</span><span class="muted">${esc(a.detail)}</span><b class="num">${fmt(a.amount)}</b></a>`).join("")}</div>`
            : `<div class="ex-alert ok">✓ Tidak ada pending approval</div>`, "slim");
        const pnl = exPanel("💹", "Profit & Loss Summary", `<div class="ex-pnl">${d.pnl.map(r => `<div class="ex-pnl-row ${r.strong ? "strong" : ""}">
            <span>${esc(r.pos)}</span><b class="${r.amount > 0 && r.strong ? "txt-green" : r.amount < 0 ? "txt-red" : ""}">${fmt(r.amount)}</b></div>`).join("")}</div>
            <div class="ex-banner ${d.net_status.toLowerCase()}">${d.net_status === "UNTUNG" ? "🟢" : d.net_status === "RUGI" ? "🔴" : "🟡"} ${d.net_status} · ${fmt(d.net_profit)}</div>`);
        const dept = exPanel("🏢", "Profit per Departemen", `<div class="ex-dept">${d.departments.map(x => `<div class="ex-dept-card ${x.status.toLowerCase()}" title="${esc(x.note)}">
            <div class="ex-dept-name">${esc(x.dept.toUpperCase())}</div><div class="ex-dept-val">● ${fmt(x.value)}</div><div class="ex-dept-st">${esc(x.status)}</div></div>`).join("")}</div>
            <div class="ex-foot">Best: <b>${esc(d.best_dept || "—")}</b> · Rugi: <b class="txt-red">${esc(d.worst_dept || "—")}</b> · arahkan kursor ke kartu untuk dasar perhitungan.</div>`);
        const tp = exPanel("🏷️", "Top Produk (Gross Profit)", exTop(d.top_products, "Belum ada data."));
        const tc = exPanel("👥", "Top Customer (Gross Profit)", exTop(d.top_customers, "Belum ada data."));
        const ops = exPanel("📦", "Inventory & Operasional", `<div class="ex-grid6">${d.operations.map(k => exCard(k)).join("")}</div>`);
        const charts = d.charts.map(c => exPanel("📈", c.title, chart(c.chart) + (c.link ? `<div class="ex-foot"><a onclick="go('${c.link}')">Telusuri →</a></div>` : ""))).join("");
        el.innerHTML = `<div class="ex">${welcomeBanner(d.approvals.length ? `${d.approvals.length} permintaan approval menunggu keputusan Anda.` : "Semua approval sudah ditangani. Berikut ringkasan perusahaan hari ini.")}${kpi}${appr}
          <div class="ex-2col"><div>${pnl}${tp}</div><div>${dept}${tc}</div></div>${ops}
          <div class="ex-section">GRAFIK KPI</div><div class="ex-2col charts">${charts}</div></div>`;
    }
};

PAGES.approvals = {
    sub: "Semua permintaan approval yang menunggu Owner: diskon di atas 10% dan PO di atas Rp1.000.000.",
    async render(el) {
        const rows = await api("/approvals");
        if (!rows.length) { el.innerHTML = '<div class="empty">Tidak ada permintaan approval. Quotation dengan diskon > 10% otomatis masuk ke sini.</div>'; return; }
        el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Jenis</th><th>Dokumen</th><th>Pihak</th><th>Detail</th><th class="num">Nilai</th><th>Diajukan oleh</th><th>Aksi</th></tr></thead><tbody>
          ${rows.map((r, i) => `<tr><td>${badge(r.type)}</td><td><a href="#doc/${r.kind}/${r.id}"><b>${esc(r.number)}</b></a></td><td>${esc(r.party)}</td><td>${esc(r.detail)}</td>
            <td class="num">${fmt(r.amount)}</td><td>${esc(r.requested_by)}</td><td style="display:flex;gap:6px"><button class="btn primary" data-ap="${i}">✓ Approve</button><button class="btn" data-rj="${i}">✕ Reject</button></td></tr>`).join("")}</tbody></table></div>`;
        el.querySelectorAll("[data-ap]").forEach(b => b.onclick = async () => { const r = rows[+b.dataset.ap];
            try { await post(r.kind === "sale" ? `/sales-orders/${r.id}/approve-discount` : `/purchase-orders/${r.id}/approve`); notice(`${r.number} disetujui.`); route(); } catch (e) { notice(e.message, true); } });
        el.querySelectorAll("[data-rj]").forEach(b => b.onclick = async () => { const r = rows[+b.dataset.rj]; const n = prompt("Alasan penolakan:"); if (n === null) return;
            try { await post(r.kind === "sale" ? `/sales-orders/${r.id}/reject-discount` : `/purchase-orders/${r.id}/reject`, { note: n }); notice(`${r.number} ditolak.`); route(); } catch (e) { notice(e.message, true); } });
    }
};
PAGES.profit = {
    sub: "Laba kotor dari invoice Posted dikurangi retur; dilihat per customer, per produk, dan per Sales. Status Rugi = penjualan di bawah harga pokok atau barang retur rusak.",
    async render(el) {
        const r = await api("/reports/profit");
        el.innerHTML = `<div class="panel"><h3>Laba Rugi Perusahaan</h3>${table(r.summary)}</div>
          <div class="panel"><h3>Per Customer</h3>${table(r.by_customer, { empty: "Belum ada invoice Posted." })}</div>
          <div class="panel"><h3>Per Produk</h3>${table(r.by_product, { empty: "Belum ada invoice Posted." })}</div>
          <div class="panel"><h3>Per Sales (pembuat SO)</h3>${table(r.by_sales, { empty: "Belum ada invoice Posted." })}</div>`;
    }
};
function permMatrix(cat, has, base) {
    const ACTIONS = ["Create", "Read", "Update", "Delete", "Approve", "Post"];
    const mods = [...new Set(cat.map(c => c.module))];
    return `<div class="table-wrap"><table class="perm-table"><thead><tr><th>Modul</th>${ACTIONS.map(a => `<th>${a}</th>`).join("")}</tr></thead><tbody>
      ${mods.map(mo => `<tr><td><b>${esc(mo)}</b></td>${ACTIONS.map(a => `<td>${cat.filter(c => c.module === mo && c.action === a).map(c => {
          const diff = base ? (has.has(c.permission) !== base.has(c.permission)) : false;
          return `<label class="perm ${diff ? "perm-diff" : ""}"><input type="checkbox" value="${esc(c.permission)}" ${has.has(c.permission) ? "checked" : ""}> ${esc(c.label)}${diff ? (has.has(c.permission) ? " (+individu)" : " (dicabut)") : ""}</label>`; }).join("") || '<span class="muted">—</span>'}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>`;
}
async function userPermDialog(u) {
    const [p, cat] = await Promise.all([api(`/admin/users/${u.id}/permissions`), api("/admin/catalog")]);
    const base = new Set(p.role_permissions);
    const m = openModal(`Hak akses individu — ${u.full_name} (${u.username})`, `<div class="hint-box">Role <b>${esc(p.user.role)}</b> · ${esc(p.user.level)}. Centang/hapus untuk memberi atau mencabut akses khusus orang ini tanpa mengubah role lain. Yang berbeda dari role ditandai.</div>
      ${permMatrix(cat, new Set(p.effective), base)}`,
        async m => { const r = await api(`/admin/users/${u.id}/permissions`, { method: "PUT", body: JSON.stringify({ permissions: [...m.querySelectorAll(".perm input:checked")].map(i => i.value) }) });
            return `Hak akses ${u.username} disimpan: +${r.added.length} / −${r.removed.length}. Berlaku pada klik berikutnya user tersebut.`; }, "Simpan hak akses");
    m.querySelector(".modal").style.width = "min(1100px, 96vw)";
}
PAGES.logins = { sub: "Riwayat login berhasil dan gagal (termasuk akun nonaktif).",
    async render(el) { const rows = (await api("/admin/login-history")).map(r => ({ ...r, status: r.success ? "Success" : "Failed" }));
        listView(el, { rows, groupBy: ["username", "status"], columns: ["created_at", "username", "status", "note", "ip", "user_agent"] }); } };
PAGES.permlog = { sub: "Access audit log: pembuatan user/role, assign role, aktif/nonaktif, perubahan permission.",
    async render(el) { listView(el, { rows: await api("/admin/permission-changes"), statusKey: "change_type", groupBy: ["target", "actor"],
        columns: ["created_at", "actor", "change_type", "target", "detail"] }); } };

function showUser() {
    $("#userName").textContent = ME.user.name;
    const av = $("#userAvatar"); if (av) av.textContent = ME.user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    $("#userRole").textContent = ME.user.role + (["Admin", "Owner"].includes(ME.user.role) ? "" : " · " + (ME.user.level || "Manager"));
}

/* ---------------- Boot ---------------- */
$("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    try { await post("/login", Object.fromEntries(new FormData(e.target))); await boot(); }
    catch (err) { $("#loginError").textContent = err.message; e.target.password.value = ""; e.target.password.focus(); }
});
$("#pwToggle").onclick = () => { const i = $("#lgPass"), show = i.type === "password"; i.type = show ? "text" : "password"; $("#pwToggle").textContent = show ? "Sembunyikan" : "Lihat"; };
$("#logout").onclick = $("#logoutTop").onclick = async () => { try { sessionStorage.removeItem("sr_landed"); } catch (e) { } await post("/logout"); location.hash = ""; location.reload(); };
$("#appsBtn").onclick = () => go("home");
async function boot() {
    ME = await api("/me"); MASTER = null;
    try { WAREHOUSES = await api("/masters/warehouses"); } catch (e) { WAREHOUSES = [{ code: "WH-PKU", name: "Gudang Utama" }, { code: "OUT-MRP", name: "Titik Ambil Marpoyan" }]; }
    $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
    showUser();
    if (ME.user.role === "Owner" && (!location.hash || location.hash === "#home") && !sessionStorage_get("sr_landed")) {
        sessionStorage_set("sr_landed", "1"); location.hash = "reporting/owner-dashboard"; return;
    }
    route();
}
function sessionStorage_get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function sessionStorage_set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
(async () => { try { const s = await api("/session"); if (s.authenticated) await boot(); } catch (e) { } })();


/* ================= Animasi, 3D & sapaan (UI) =================
 * - Reveal: panel/kartu muncul naik bertahap saat discroll ke layar (IntersectionObserver).
 * - Grafik: kolom tumbuh dari bawah, bar memanjang, angka KPI menghitung naik.
 * - Tilt 3D: kartu KPI, tile aplikasi dan kartu departemen miring mengikuti kursor.
 * - Lemon 3D: irisan lemon berputar di halaman login dan banner sapaan.
 * Semua animasi dimatikan bila pengguna memilih "reduce motion" di sistem operasinya. */
const FX_OK = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const REVEAL_SEL = ".welcome,.ex-panel,.dash-panel,.panel,.metric,.sheet,.app-tile,.ex-card,.section-title,.ex-section,.ex-dept-card";
const TILT_SEL = ".ex-card,.app-tile:not(.locked),.metric,.ex-dept-card";
const COUNT_SEL = ".ex-val,.metric .value,.ex-dept-val";
let fxIO = null;

function greeting() {
    const h = new Date().getHours();
    return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}
function welcomeBanner(message) {
    if (!ME) return "";
    const first = ME.user.name.split(" ")[0];
    const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const roleText = { Admin: "Kelola akun, role dan hak akses tim.", Owner: "Pantau kinerja perusahaan dan putuskan approval.",
        Sales: "Kelola pelanggan, quotation dan pesanan.", Warehouse: "Jaga stok, penerimaan dan pengiriman tetap akurat.",
        Procurement: "Atur vendor dan pembelian barang.", Finance: "Tagihan, pembayaran dan jurnal ada di sini.",
        Quality: "Pastikan hanya barang layak yang masuk dan keluar." }[ME.user.role] || "";
    return `<section class="welcome"><div class="welcome-text"><p class="eyebrow">${esc(today)}</p>
      <h2>${greeting()}, ${esc(first)}</h2><p>${esc(message || roleText)}</p>
      <div class="welcome-tags"><span>${esc(ME.user.role)}${["Admin", "Owner"].includes(ME.user.role) ? "" : " · " + esc(ME.user.level || "Manager")}</span><span>PT Segar Rasa Riau</span></div></div>
      <div class="welcome-art" aria-hidden="true"><div class="lemon3d" data-size="150"></div><div class="lemon3d mini" data-size="70"></div></div></section>`;
}

function buildLemons(root) {
    root.querySelectorAll(".lemon3d:not([data-built])").forEach(el => {
        el.dataset.built = "1";
        const n = 9;
        let html = "";
        for (let i = 0; i < n; i++) html += `<i class="rind" style="transform:translateZ(${-i * 1.6}px)"></i>`;
        html += `<i class="face front"></i><i class="face back" style="transform:rotateY(180deg) translateZ(${(n - 1) * 1.6}px)"></i>`;
        el.innerHTML = `<div class="lemon-spin">${html}</div>`;
        if (el.dataset.size) el.style.setProperty("--ls", el.dataset.size + "px");
    });
}

function fxObserver() {
    if (fxIO || !("IntersectionObserver" in window)) return fxIO;
    fxIO = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add("fx-in");
        fxIO.unobserve(e.target);
        countIn(e.target);
    }), { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
    return fxIO;
}
function fxEnhance(root) {
    buildLemons(root);
    if (!FX_OK) return;
    const io = fxObserver();
    let i = 0;
    root.querySelectorAll(REVEAL_SEL).forEach(el => {
        if (el.dataset.fx) return;
        el.dataset.fx = "1";
        el.classList.add("fx-reveal");
        el.style.setProperty("--fx-d", `${(i++ % 8) * 55}ms`);
        if (io) io.observe(el); else el.classList.add("fx-in");
    });
    root.querySelectorAll(".chart").forEach(svg => svg.querySelectorAll("rect").forEach((r, k) => r.style.setProperty("--ri", k)));
    root.querySelectorAll(".bar-row,.dv-row,.ex-top-row").forEach((r, k) => r.style.setProperty("--ri", k % 12));
    root.querySelectorAll(TILT_SEL).forEach(el => {
        if (el.dataset.tilt) return;
        el.dataset.tilt = "1";
        el.classList.add("fx-tilt");
        el.addEventListener("pointermove", tiltMove);
        el.addEventListener("pointerleave", tiltLeave);
    });
}
function tiltMove(e) {
    if (e.pointerType === "touch") return;
    const r = this.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    this.style.transform = `perspective(800px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-3px)`;
    this.style.setProperty("--gx", `${((x + .5) * 100).toFixed(1)}%`);
    this.style.setProperty("--gy", `${((y + .5) * 100).toFixed(1)}%`);
}
function tiltLeave() { this.style.transform = ""; }

function countIn(scope) {
    const targets = scope.matches(COUNT_SEL) ? [scope] : [...scope.querySelectorAll(COUNT_SEL)];
    targets.forEach(el => {
        if (el.dataset.counted) return;
        el.dataset.counted = "1";
        const txt = el.textContent, m = txt.match(/^(\D*?)([\d.]{1,15})(\D*)$/);
        if (!m || m[2].replace(/\./g, "") === "") return;
        const target = parseInt(m[2].replace(/\./g, ""), 10);
        if (!target || target < 2) return;
        const t0 = performance.now(), dur = 900;
        const step = now => {
            const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
            el.textContent = m[1] + Math.round(target * e).toLocaleString("id-ID") + m[3];
            if (p < 1) requestAnimationFrame(step); else el.textContent = txt;
        };
        requestAnimationFrame(step);
    });
}

(function initFx() {
    const content = $("#pageContent");
    if (content && "MutationObserver" in window) {
        let queued = false;
        new MutationObserver(() => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; fxEnhance(content); });
        }).observe(content, { childList: true, subtree: true });
    }
    const head = $(".page-heading");
    if (head && "MutationObserver" in window && FX_OK) {
        new MutationObserver(() => { head.classList.remove("fx-head"); void head.offsetWidth; head.classList.add("fx-head"); })
            .observe($("#heading"), { childList: true, characterData: true, subtree: true });
    }
    const login = $("#login");
    if (login) {
        buildLemons(login);
        const stage = $(".hero-stage");
        if (stage && FX_OK) login.addEventListener("pointermove", e => {
            const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
            stage.style.transform = `rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg)`;
        });
    }
})();
