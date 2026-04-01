const ADMIN_KEY_STORAGE = "irfmak_admin_key";

const adminLogin = document.getElementById("admin-login");
const adminApp = document.getElementById("admin-app");
const adminKeyInput = document.getElementById("admin-key-input");
const adminLoginBtn = document.getElementById("admin-login-btn");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");

const pageTitle = document.getElementById("page-title");
const navButtons = document.querySelectorAll(".nav-btn");
const tabSections = document.querySelectorAll(".tab-section");

const statHandoffs = document.getElementById("stat-handoffs");
const statSessions = document.getElementById("stat-sessions");
const statLeads = document.getElementById("stat-leads");
const statTodayHandoffs = document.getElementById("stat-today-handoffs");
const statWeekLeads = document.getElementById("stat-week-leads");
const statMonthLeads = document.getElementById("stat-month-leads");

const recentHandoffsEl = document.getElementById("recent-handoffs");
const handoffsListEl = document.getElementById("handoffs-list");
const sessionsListEl = document.getElementById("sessions-list");
const leadsListEl = document.getElementById("leads-list");
const leadStatusSummaryEl = document.getElementById("lead-status-summary");
const reportsSummaryEl = document.getElementById("reports-summary");

const leadSearchInput = document.getElementById("lead-search");
const leadStatusFilter = document.getElementById("lead-status-filter");

const salesForm = document.getElementById("sales-form");
const salesCustomerName = document.getElementById("sales-customer-name");
const salesCustomerPhone = document.getElementById("sales-customer-phone");
const salesProductName = document.getElementById("sales-product-name");
const salesDescription = document.getElementById("sales-description");
const salesAmount = document.getElementById("sales-amount");
const salesPaymentType = document.getElementById("sales-payment-type");
const salesFormResult = document.getElementById("sales-form-result");
const salesListEl = document.getElementById("sales-list");

let allLeads = [];
let allHandoffs = [];
let allSessions = {};
let allSales = [];

function getAdminKey() {
    return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

function setAdminKey(key) {
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

function clearAdminKey() {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
}

async function adminFetch(url, options = {}) {
    const key = getAdminKey();

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "x-admin-key": key,
            ...(options.headers || {}),
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Hata oluştu");
    }

    return data;
}

function showApp() {
    adminLogin.classList.add("hidden");
    adminApp.classList.remove("hidden");
}

function showLogin() {
    adminApp.classList.add("hidden");
    adminLogin.classList.remove("hidden");
}

function getTabTitle(tabName) {
    const map = {
        "genel-bakis": "Genel Bakış",
        "yonlendirmeler": "Yetkili Yönlendirmeleri",
        "oturumlar": "Sohbet Oturumları",
        "talepler": "Müşteri Talepleri",
        "satislar": "Satışlar",
        "raporlar": "Raporlar",
    };
    return map[tabName] || tabName;
}

function switchTab(tabName) {
    navButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    tabSections.forEach((section) => {
        // HATA DÜZELTİLDİ: Template literal tırnakları eklendi
        section.classList.toggle("active", section.id === `${tabName}-tab`);
    });

    pageTitle.textContent = getTabTitle(tabName);
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("tr-TR");
}

function safeText(value) {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
}

function daysDiff(dateStr) {
    if (!dateStr) return Infinity;
    const now = new Date();
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return Infinity;
    return (now - date) / (1000 * 60 * 60 * 24);
}

function getStatusBadgeClass(status) {
    const map = {
        yeni: "badge-yeni",
        "aranıyor": "badge-araniyor",
        "satış": "badge-satis",
        iptal: "badge-iptal",
    };
    return map[status] || "badge-yeni";
}

function statusBadgeHtml(status) {
    const safeStatus = safeText(status).toLowerCase();
    // HATA DÜZELTİLDİ: Template literal tırnakları eklendi
    return `<span class="status-badge ${getStatusBadgeClass(safeStatus)}">${safeText(status)}</span>`;
}

// Render fonksiyonları (Handoffs, Sessions vb.) aynı mantıkla çalışıyor.
function renderRecentHandoffs(items) {
    recentHandoffsEl.innerHTML = "";
    if (!items.length) {
        recentHandoffsEl.innerHTML = '<p class="empty-text">Kayıt yok</p>';
        return;
    }
    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "list-card";
        card.innerHTML = `
            <div class="list-title">${safeText(item.customerName)}</div>
            <div class="list-meta">
                ${safeText(item.customerPhone)} • ${safeText(item.handoffReasonLabel)} • ${formatDate(item.createdAt)}
            </div>
            <div class="list-text">${safeText(item.summary)}</div>
        `;
        recentHandoffsEl.appendChild(card);
    });
}

function renderHandoffs(items) {
    handoffsListEl.innerHTML = "";
    if (!items.length) {
        handoffsListEl.innerHTML = '<p class="empty-text">Yönlendirme kaydı yok</p>';
        return;
    }
    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "list-card";
        card.innerHTML = `
            <div class="list-title">${safeText(item.customerName)}</div>
            <div class="list-meta">
                ${safeText(item.customerPhone)} • ${safeText(item.handoffReasonLabel)} • ${formatDate(item.createdAt)}
            </div>
            <div class="list-text">${safeText(item.summary)}</div>
        `;
        handoffsListEl.appendChild(card);
    });
}

function renderSessions(sessionsObj) {
    sessionsListEl.innerHTML = "";
    const entries = Object.entries(sessionsObj || {});
    if (!entries.length) {
        sessionsListEl.innerHTML = '<p class="empty-text">Oturum yok</p>';
        return;
    }
    entries
        .sort((a, b) => new Date((b[1] && b[1].updatedAt) || 0) - new Date((a[1] && a[1].updatedAt) || 0))
        .forEach(([sessionId, session]) => {
            const messages = Array.isArray(session.messages)
                ? session.messages.filter((m) => m.role !== "system")
                : [];
            const lastMessage = messages.length ? messages[messages.length - 1] : null;
            const card = document.createElement("div");
            card.className = "list-card";
            card.innerHTML = `
                <div class="list-title">Oturum: ${safeText(sessionId)}</div>
                <div class="list-meta">
                    Oluşturulma: ${formatDate(session.createdAt)} • Güncelleme: ${formatDate(session.updatedAt)} • Mesaj: ${messages.length}
                </div>
                <div class="list-text">Son mesaj: ${lastMessage ? safeText(lastMessage.content) : "-"}</div>
            `;
            sessionsListEl.appendChild(card);
        });
}

function buildLeadActionButtons(leadId) {
    return `
        <div class="list-actions">
            <button class="small-btn" onclick="updateLeadStatus('${leadId}', 'yeni')">Yeni</button>
            <button class="small-btn" onclick="updateLeadStatus('${leadId}', 'aranıyor')">Aranıyor</button>
            <button class="small-btn" onclick="updateLeadStatus('${leadId}', 'satış')">Satış</button>
            <button class="small-btn" onclick="updateLeadStatus('${leadId}', 'iptal')">İptal</button>
        </div>
    `;
}

function renderLeads(items) {
    leadsListEl.innerHTML = "";
    if (!items.length) {
        leadsListEl.innerHTML = '<p class="empty-text">Talep yok</p>';
        return;
    }
    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "list-card";
        card.innerHTML = `
            <div class="list-title">${safeText(item.customerName)}</div>
            <div class="list-meta">
                ${safeText(item.customerPhone)} • ${safeText(item.reasonLabel)} • ${statusBadgeHtml(item.status)} • ${formatDate(item.createdAt)}
            </div>
            <div class="list-text">${safeText(item.detail)}</div>
            ${buildLeadActionButtons(item.id)}
        `;
        leadsListEl.appendChild(card);
    });
}

function renderLeadStatusSummary(leads) {
    leadStatusSummaryEl.innerHTML = "";
    const counts = { yeni: 0, "aranıyor": 0, "satış": 0, iptal: 0 };
    leads.forEach((lead) => {
        const status = (lead.status || "yeni").toLowerCase();
        if (counts[status] !== undefined) counts[status]++;
    });
    Object.entries(counts).forEach(([key, value]) => {
        const box = document.createElement("div");
        box.className = "summary-box";
        // HATA DÜZELTİLDİ: Template literal tırnakları eklendi
        box.innerHTML = `<strong>${key}</strong><div>${value}</div>`;
        leadStatusSummaryEl.appendChild(box);
    });
}

function renderReports(leads, handoffs) {
    reportsSummaryEl.innerHTML = "";
    const weekLeads = leads.filter((item) => daysDiff(item.createdAt) <= 7).length;
    const monthLeads = leads.filter((item) => daysDiff(item.createdAt) <= 30).length;
    const weekHandoffs = handoffs.filter((item) => daysDiff(item.createdAt) <= 7).length;
    const monthHandoffs = handoffs.filter((item) => daysDiff(item.createdAt) <= 30).length;
    const salesCount = leads.filter((item) => item.status === "satış").length;
    const cancelledCount = leads.filter((item) => item.status === "iptal").length;

    const reasonCounts = {};
    leads.forEach((item) => {
        const key = item.reasonLabel || "Diğer";
        reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    });
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

    // HATA DÜZELTİLDİ: Array içindeki stringler template literal haline getirildi
    const boxes = [
        `Bu hafta talep: ${weekLeads}`,
        `Bu ay talep: ${monthLeads}`,
        `Bu hafta yönlendirme: ${weekHandoffs}`,
        `Bu ay yönlendirme: ${monthHandoffs}`,
        `Toplam satış durumundaki talep: ${salesCount}`,
        `Toplam iptal durumundaki talep: ${cancelledCount}`,
        `En çok gelen talep konusu: ${topReason ? `${topReason[0]} (${topReason[1]})` : "-"}`
    ];

    boxes.forEach((text) => {
        const box = document.createElement("div");
        box.className = "report-box";
        box.textContent = text;
        reportsSummaryEl.appendChild(box);
    });
}

function renderSales(items) {
    salesListEl.innerHTML = "";
    if (!items.length) {
        salesListEl.innerHTML = '<p class="empty-text">Satış kaydı yok</p>';
        return;
    }
    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "list-card";
        card.innerHTML = `
            <div class="list-title">${safeText(item.musteri_adi)} • ${safeText(item.urun_adi)}</div>
            <div class="list-meta">
                ${safeText(item.musteri_telefonu)} • ${safeText(item.odeme_tipi)} • ${safeText(item.tutar)} ${safeText(item.para_birimi)}
            </div>
            <div class="list-text">${safeText(item.aciklama)}</div>
            <div class="list-meta">
                Makbuz No: ${safeText(item.makbuz_no)} • Tarih: ${formatDate(item.makbuz_tarihi)}
            </div>
            <div class="list-actions">
                <button class="print-btn" onclick='printReceipt(${JSON.stringify(item).replace(/'/g, "&apos;")})'>Makbuz Yazdır</button>
            </div>
        `;
        salesListEl.appendChild(card);
    });
}

// Filtreleme ve Diğer Fonksiyonlar
function applyLeadFilters() {
    let filtered = [...allLeads];
    const search = (leadSearchInput?.value || "").trim().toLowerCase();
    const status = leadStatusFilter?.value || "";

    if (search) {
        filtered = filtered.filter((item) => 
            String(item.customerName || "").toLowerCase().includes(search) ||
            String(item.customerPhone || "").toLowerCase().includes(search) ||
            String(item.detail || "").toLowerCase().includes(search)
        );
    }
    if (status) {
        filtered = filtered.filter((item) => (item.status || "yeni") === status);
    }
    renderLeads(filtered);
}

window.updateLeadStatus = async function (leadId, status) {
    try {
        await adminFetch("/admin/sqlite-talep-durum-guncelle", {
            method: "POST",
            body: JSON.stringify({ id: leadId, status }),
        });
        await loadAll();
    } catch (error) {
        alert("Talep durumu güncellenemedi.");
    }
};

window.printReceipt = function (item) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
        <html>
            <head><title>Makbuz - ${item.makbuz_no || ""}</title></head>
            <body>
                <div style="font-family:Arial; border:1px solid #ddd; padding:20px; border-radius:10px;">
                    <h1>İrfmak Satış Makbuzu</h1>
                    <p><strong>Makbuz No:</strong> ${safeText(item.makbuz_no)}</p>
                    <p><strong>Tarih:</strong> ${formatDate(item.makbuz_tarihi)}</p>
                    <p><strong>Müşteri:</strong> ${safeText(item.musteri_adi)}</p>
                    <p><strong>Telefon:</strong> ${safeText(item.musteri_telefonu)}</p>
                    <p><strong>Ürün:</strong> ${safeText(item.urun_adi)}</p>
                    <p><strong>Tutar:</strong> ${safeText(item.tutar)} ${safeText(item.para_birimi)}</p>
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
        </html>
    `);
    win.document.close();
};

async function loadAll() {
    try {
        const dashboard = await adminFetch("/admin/sqlite-dashboard");
        const handoffs = await adminFetch("/admin/sqlite-yonlendirmeler");
        const sessions = await adminFetch("/admin/sqlite-oturumlar");
        const leads = await adminFetch("/admin/sqlite-talepler");
        const sales = await adminFetch("/admin/satislar");

        allLeads = Array.isArray(leads) ? leads : [];
        allHandoffs = Array.isArray(handoffs) ? handoffs : [];
        allSessions = sessions || {};
        allSales = Array.isArray(sales) ? sales : [];

        statHandoffs.textContent = dashboard.totalHandoffs || 0;
        statSessions.textContent = dashboard.totalSessions || 0;
        statLeads.textContent = dashboard.totalLeads || 0;
        statTodayHandoffs.textContent = dashboard.todayHandoffs || 0;

        renderRecentHandoffs(dashboard.recentHandoffs || []);
        renderHandoffs(allHandoffs);
        renderSessions(allSessions);
        renderLeadStatusSummary(allLeads);
        renderReports(allLeads, allHandoffs);
        renderSales(allSales);
        applyLeadFilters();
    } catch (error) {
        console.error("Yükleme hatası:", error);
        showLogin();
    }
}

// Event Listeners
adminLoginBtn.addEventListener("click", async () => {
    const key = adminKeyInput.value.trim();
    if (!key) return;
    setAdminKey(key);
    await loadAll();
    showApp();
});

logoutBtn.addEventListener("click", () => {
    clearAdminKey();
    showLogin();
});

navButtons.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

if (salesForm) {
    salesForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const result = await adminFetch("/admin/satis-ekle", {
                method: "POST",
                body: JSON.stringify({
                    musteriAdi: salesCustomerName.value.trim(),
                    musteriTelefonu: salesCustomerPhone.value.trim(),
                    urunAdi: salesProductName.value.trim(),
                    aciklama: salesDescription.value.trim(),
                    tutar: salesAmount.value,
                    odemeTipi: salesPaymentType.value,
                }),
            });
            // HATA DÜZELTİLDİ: Template literal tırnakları eklendi
            salesFormResult.textContent = `Satış kaydedildi. Makbuz No: ${result.makbuzNo}`;
            salesForm.reset();
            await loadAll();
        } catch (error) {
            salesFormResult.textContent = "Satış kaydedilemedi.";
        }
    });
}

window.addEventListener("load", async () => {
    if (getAdminKey()) {
        await loadAll();
        showApp();
    }
});