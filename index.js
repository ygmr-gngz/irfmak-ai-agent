require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");
const { initDb, getDb } = require("./db");
const { PRODUCT_CATALOG } = require("./productCatalog");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = process.env.ADMIN_KEY || "change_this_admin_key";
const WHATSAPP_NUMBER = String(process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY eksik. .env dosyasını kontrol et.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DATA_DIR = path.join(__dirname, "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const HANDOFFS_FILE = path.join(DATA_DIR, "handoffs.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function ensureJsonFile(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2), "utf8");
  }
}

ensureJsonFile(SESSIONS_FILE, {});
ensureJsonFile(HANDOFFS_FILE, []);
ensureJsonFile(LEADS_FILE, []);

function readJson(filePath, fallbackValue) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function nowIso() { return new Date().toISOString(); }

function safeText(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function normalizeText(text) {
  return String(text || "").toLocaleLowerCase("tr-TR");
}

function getSessions() { return readJson(SESSIONS_FILE, {}); }
function getHandoffs() { return readJson(HANDOFFS_FILE, []); }
function getLeads() { return readJson(LEADS_FILE, []); }
function saveSessions(data) { writeJson(SESSIONS_FILE, data); }
function saveHandoffs(data) { writeJson(HANDOFFS_FILE, data); }
function saveLeads(data) { writeJson(LEADS_FILE, data); }

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((v) => v.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.length) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function reasonLabel(reason) {
  const map = {
    yetkili: "Yetkili görüşme",
    toplu_satis: "Toplu satış",
    teklif: "Teklif talebi",
    servis: "Servis talebi",
    teknik: "Teknik destek",
    urun: "Ürün danışma",
  };
  return map[reason] || "Genel talep";
}

function buildWhatsappLink(prefillText = "Merhaba") {
  if (!WHATSAPP_NUMBER) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(prefillText)}`;
}

function getOrCreateSession(sessionId) {
  const sessions = getSessions();
  if (!sessionId || !sessions[sessionId]) {
    const newId = crypto.randomUUID();
    sessions[newId] = {
      messages: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      state: { customerName: null, customerPhone: null },
    };
    saveSessions(sessions);
    return { id: newId, session: sessions[newId], sessions };
  }
  return { id: sessionId, session: sessions[sessionId], sessions };
}

function detectIntent(message) {
  const text = normalizeText(message);
  if (text.includes("yetkili") || text.includes("temsilci") || text.includes("görüşmek istiyorum") || text.includes("sizi arayın")) return "yetkili";
  if (text.includes("toplu") || text.includes("toptan") || /\b\d+\s*(adet|tane)\b/.test(text)) return "toplu_satis";
  if (text.includes("teklif")) return "teklif";
  if (text.includes("servis")) return "servis";
  if (text.includes("arıza") || text.includes("ariza") || text.includes("teknik")) return "teknik";
  return "urun";
}

function detectMachineTypes(message) {
  const text = normalizeText(message);
  const found = [];
  if (text.includes("ev tipi") || text.includes("ev için") || text.includes("evde")) found.push("ev_tipi");
  if (text.includes("sanayi")) found.push("sanayi_genel");
  if (text.includes("overlok") || text.includes("overlock")) found.push("overlok");
  if (text.includes("reçme") || text.includes("recme")) found.push("recme");
  if (text.includes("zigzag")) found.push("zigzag");
  if (text.includes("çift iğne") || text.includes("cift iğne")) found.push("cift_igne");
  if (text.includes("düz dikiş") || text.includes("duz dikis")) found.push("duz_dikis");
  if (text.includes("kesim")) found.push("kesim");
  if (text.includes("ütü") || text.includes("utu")) found.push("utu");
  if (text.includes("parça") || text.includes("yedek parça") || text.includes("iğne") || text.includes("ayak")) found.push("parca");
  return [...new Set(found)];
}

function productMatchesType(product, requestedTypes) {
  if (!requestedTypes || requestedTypes.length === 0) return true;
  for (const t of requestedTypes) {
    if (t === "sanayi_genel") {
      if (String(product.category || "").startsWith("sanayi_") || ["overlok", "recme", "zigzag", "cift_igne", "duz_dikis"].includes(product.machineType)) return true;
    }
    if (t === "ev_tipi" && product.machineType === "ev_tipi") return true;
    if (t === "overlok" && product.machineType === "overlok") return true;
    if (t === "recme" && product.machineType === "recme") return true;
    if (t === "zigzag" && product.machineType === "zigzag") return true;
    if (t === "cift_igne" && product.machineType === "cift_igne") return true;
    if (t === "duz_dikis" && product.machineType === "duz_dikis") return true;
    if (t === "kesim" && product.machineType === "kesim") return true;
    if (t === "utu" && product.machineType === "utu") return true;
    if (t === "parca" && (product.machineType === "parca" || product.machineType === "igne")) return true;
  }
  return false;
}

function recommendProducts(message) {
  const requestedTypes = detectMachineTypes(message);
  
  let filtered = requestedTypes.length > 0
    ? PRODUCT_CATALOG.filter((p) => p.inStock && productMatchesType(p, requestedTypes))
    : PRODUCT_CATALOG.filter((p) => p.inStock);

  if (!filtered.length) {
    filtered = PRODUCT_CATALOG.filter((p) => p.inStock);
  }

  return filtered.slice(0, 5);
}

function buildProductHint(message) {
  const products = recommendProducts(message);
  const fallback = products.length
    ? products
    : PRODUCT_CATALOG.filter(p => p.inStock);

  return fallback
    .slice(0, 8)
    .map((p, i) => `${i + 1}. ${p.title} - ${p.priceText} - ${p.url}`)
    .join("\n");
}

/* SQLITE HELPERS */

async function dbOturumOlusturVeyaGuncelle(oturumKodu) {
  const db = await getDb();
  const now = nowIso();
  const mevcut = await db.get(`SELECT id FROM sohbet_oturumlari WHERE oturum_kodu = ?`, [oturumKodu]);
  if (mevcut) {
    await db.run(`UPDATE sohbet_oturumlari SET guncellenme_tarihi = ? WHERE oturum_kodu = ?`, [now, oturumKodu]);
    return mevcut.id;
  }
  const result = await db.run(
    `INSERT INTO sohbet_oturumlari (oturum_kodu, olusturulma_tarihi, guncellenme_tarihi, durum) VALUES (?, ?, ?, ?)`,
    [oturumKodu, now, now, "aktif"]
  );
  return result.lastID;
}

async function dbMesajKaydet(oturumKodu, gonderenTipi, mesaj) {
  const db = await getDb();
  const oturumId = await dbOturumOlusturVeyaGuncelle(oturumKodu);
  await db.run(
    `INSERT INTO sohbet_mesajlari (oturum_id, gonderen_tipi, mesaj, tarih) VALUES (?, ?, ?, ?)`,
    [oturumId, gonderenTipi, mesaj, nowIso()]
  );
}

async function dbMusteriTalebiKaydet({ oturumKodu, musteriAdi, musteriTelefonu, talepTuru, talepEtiketi, aciklama, durum = "yeni" }) {
  const db = await getDb();
  await db.run(
    `INSERT INTO musteri_talepleri (oturum_kodu, musteri_adi, musteri_telefonu, talep_turu, talep_etiketi, aciklama, durum, olusturulma_tarihi) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [oturumKodu, safeText(musteriAdi), safeText(musteriTelefonu), safeText(talepTuru), safeText(talepEtiketi), safeText(aciklama), durum, nowIso()]
  );
}

async function dbYetkiliYonlendirmeKaydet({ oturumKodu, musteriAdi, musteriTelefonu, yonlendirmeNedeni, yonlendirmeEtiketi, ozet, whatsappLinki, tamamlandiMi = 1 }) {
  const db = await getDb();
  await db.run(
    `INSERT INTO yetkili_yonlendirmeleri (oturum_kodu, musteri_adi, musteri_telefonu, yonlendirme_nedeni, yonlendirme_etiketi, ozet, whatsapp_linki, tamamlandi_mi, olusturulma_tarihi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [oturumKodu, safeText(musteriAdi), safeText(musteriTelefonu), safeText(yonlendirmeNedeni), safeText(yonlendirmeEtiketi), safeText(ozet), safeText(whatsappLinki), tamamlandiMi, nowIso()]
  );
}

async function dbUrunTalebiKaydet({ oturumKodu, urunAdi, kategori, makineTipi }) {
  const db = await getDb();
  await db.run(
    `INSERT INTO urun_talepleri (oturum_kodu, urun_adi, kategori, makine_tipi, talep_tarihi) VALUES (?, ?, ?, ?, ?)`,
    [oturumKodu, safeText(urunAdi), safeText(kategori), safeText(makineTipi), nowIso()]
  );
}

/* CHAT */

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();
    const incomingSessionId = req.body.sessionId || null;

    if (!message) return res.status(400).json({ error: "Mesaj gerekli" });

    const { id, session, sessions } = getOrCreateSession(incomingSessionId);

    session.messages.push({ role: "user", content: message, createdAt: nowIso() });
    session.updatedAt = nowIso();
    saveSessions(sessions);

    await dbMesajKaydet(id, "kullanici", message);

    const intent = detectIntent(message);
    let reply = "";
    let showWhatsappButton = false;
    let whatsappLink = null;
    let productLinks = [];

    if (["yetkili", "toplu_satis", "teklif", "servis", "teknik"].includes(intent)) {
      const label = reasonLabel(intent);

      if (intent === "yetkili") reply = "Elbette. Sizi yetkiliye yönlendirebilirim. WhatsApp Business üzerinden devam edebilirsiniz.";
      else if (intent === "toplu_satis") reply = "Toplu satış talebiniz için en doğru yönlendirme yetkilimiz olacaktır. WhatsApp Business üzerinden devam edebilirsiniz.";
      else if (intent === "teklif") reply = "Teklif talebiniz için sizi yetkiliye yönlendirebilirim. WhatsApp Business üzerinden devam edebilirsiniz.";
      else if (intent === "servis") reply = "Servis talebiniz için sizi yetkiliye yönlendiriyorum. WhatsApp Business üzerinden devam edebilirsiniz.";
      else reply = "Teknik destek için sizi yetkiliye yönlendirebilirim. WhatsApp Business üzerinden devam edebilirsiniz.";

      showWhatsappButton = true;
      whatsappLink = buildWhatsappLink(`Merhaba, ${label.toLowerCase()} konusunda görüşmek istiyorum.`);

      const handoffs = getHandoffs();
      handoffs.push({
        id: crypto.randomUUID(),
        sessionId: id,
        customerName: session.state?.customerName || "Bilinmiyor",
        customerPhone: session.state?.customerPhone || "",
        handoffReason: intent,
        handoffReasonLabel: label,
        handoffReasonText: message,
        summary: message,
        lastMessages: session.messages.slice(-4),
        customerWhatsappLink: whatsappLink || "",
        completed: true,
        createdAt: nowIso(),
      });
      saveHandoffs(handoffs);

      const leads = getLeads();
      leads.push({
        id: crypto.randomUUID(),
        sessionId: id,
        customerName: session.state?.customerName || "Bilinmiyor",
        customerPhone: session.state?.customerPhone || "",
        reason: intent,
        reasonLabel: label,
        detail: message,
        status: "yeni",
        createdAt: nowIso(),
      });
      saveLeads(leads);

      try {
        await dbYetkiliYonlendirmeKaydet({
          oturumKodu: id,
          musteriAdi: session.state?.customerName || "Bilinmiyor",
          musteriTelefonu: session.state?.customerPhone || "",
          yonlendirmeNedeni: intent,
          yonlendirmeEtiketi: label,
          ozet: message,
          whatsappLinki: whatsappLink || "",
          tamamlandiMi: 1,
        });
      } catch (dbError) {
        console.error("SQLite yönlendirme kayıt hatası:", dbError.message);
      }

      try {
        await dbMusteriTalebiKaydet({
          oturumKodu: id,
          musteriAdi: session.state?.customerName || "Bilinmiyor",
          musteriTelefonu: session.state?.customerPhone || "",
          talepTuru: intent,
          talepEtiketi: label,
          aciklama: message,
          durum: "yeni",
        });
      } catch (dbError) {
        console.error("SQLite talep kayıt hatası:", dbError.message);
      }

    } else {
      const recommended = recommendProducts(message);
      const productHint = buildProductHint(message);

      const systemPrompt = `
Sen İrfmak web sitesi için çalışan satış odaklı bir yapay zeka asistanısın.

Temel görevin:
- Kullanıcının ihtiyacını hızlıca anlamak
- Yalnızca web sitesinde bulunan ürünleri baz alarak öneri sunmak
- Ürün varsa ilgili ürün linkini paylaşmak
- Stok bilgisi varsa net şekilde “stokta var” veya “stokta yok” demek
- Stokta olmayan ürünlerde alternatif ürün önermek veya kullanıcıyı yetkiliye yönlendirmek
- Kullanıcıyı satın alma sürecine yaklaştırmak
- Gerektiğinde ödeme, sipariş, ürün karşılaştırma, teknik destek ve yetkili yönlendirmesi yapmak

Davranış kuralları:
1. Sadece sana verilen ürün verisini, stok verisini, kategori verisini ve linkleri kullan.
2. Asla web sitesinde olmayan ürün uydurma.
3. Asla emin olmadığın stok bilgisini kesinmiş gibi söyleme.
4. Bir ürün için stok bilgisi yoksa “stok bilgisi şu anda doğrulanamıyor” de ve kullanıcıyı yetkiliye yönlendir.
5. Kullanıcı ürün arıyorsa önce ihtiyacı netleştir:
   - ev tipi mi
   - sanayi tipi mi
   - yedek parça mı
   - marka/model belli mi
   - bütçe veya kullanım amacı nedir
6. Mümkün olduğunda tek cevapta şunları ver:
   - kısa ihtiyaç özeti
   - en uygun ürün
   - ürün linki
   - stok durumu
   - varsa kısa satın alma yönlendirmesi
7. Kullanıcı kararsızsa en fazla 2-3 uygun ürün öner.
8. Kullanıcı “hemen almak istiyorum”, “satın alacağım”, “ödeme”, “sipariş”, “link”, “sepete git” gibi bir niyet gösterirse satış odaklı ilerle:
   - en uygun ürün linkini ver
   - satın alma adımını net söyle
   - gerekiyorsa yetkili veya WhatsApp yönlendirmesi yap
9. Kullanıcı aradığı ürün sitede yoksa:
   - bunu açıkça söyle
   - benzer kategori veya alternatif öner
   - istenirse yetkiliye yönlendir
10. Kullanıcı teknik servis, bakım, parça, iğne, aksesuar, arıza veya uyumluluk sorarsa ürün satışı yerine destek odaklı ilerle.
11. Kısa, net, güven veren ve satışa destek olan bir üslup kullan.
12. Gereksiz uzun açıklama yapma.
13. Her zaman Türkçe cevap ver.

Cevap formatı:
- Doğrudan kullanıcıya hitap et
- Kısa ve profesyonel ol
- Uygunsa madde değil normal kısa paragraf kullan
- Ürün önerirken şu mantığı uygula:

Eğer uygun ürün bulunduysa:
“Aradığınız ürüne uygun seçenek şu olabilir:
[ÜRÜN_ADI]
Link: [ÜRÜN_LINKI]
Stok durumu: [STOKTA VAR / STOKTA YOK / STOK BİLGİSİ DOĞRULANAMADI]

İsterseniz satın alma için sizi ilgili ürün sayfasına yönlendirebilirim.”

Eğer ürün bulunamadıysa:
“Aradığınız ürünü sitede bulamadım. İsterseniz benzer bir alternatif önerebilirim ya da sizi yetkili ekibe yönlendirebilirim.”

Eğer stok yoksa:
“Bu ürün şu anda stokta görünmüyor. Dilerseniz benzer alternatif ürün önerebilirim veya stok teyidi için sizi yetkili ekibe yönlendirebilirim.”

Satış hedefi:
- Kullanıcıyı doğru ürüne yönlendir
- Kararsızlığı azalt
- Güven ver
- Uydurma bilgi verme
- Uygun anda ürün linki vererek satın alma aksiyonunu hızlandır
Mevcut ürünler (SADECE BUNLAR):
${productHint}
`;

      const recentMessages = session.messages
        .slice(-8)
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.6,
        messages: [{ role: "system", content: systemPrompt }, ...recentMessages],
      });

      reply =
        completion.choices?.[0]?.message?.content?.trim() ||
        "Size yardımcı olayım. Kullanım amacınızı ve nasıl bir makine aradığınızı biraz daha detaylandırır mısınız?";

      productLinks = recommended
        .slice(0, 3)
        .map((p) => ({ title: p.title, url: p.url, price: p.priceText }));

      const leads = getLeads();
      leads.push({
        id: crypto.randomUUID(),
        sessionId: id,
        customerName: session.state?.customerName || "Bilinmiyor",
        customerPhone: session.state?.customerPhone || "",
        reason: "urun",
        reasonLabel: reasonLabel("urun"),
        detail: message,
        status: "yeni",
        createdAt: nowIso(),
      });
      saveLeads(leads);

      try {
        await dbMusteriTalebiKaydet({
          oturumKodu: id,
          musteriAdi: session.state?.customerName || "Bilinmiyor",
          musteriTelefonu: session.state?.customerPhone || "",
          talepTuru: "urun",
          talepEtiketi: reasonLabel("urun"),
          aciklama: message,
          durum: "yeni",
        });
      } catch (dbError) {
        console.error("SQLite ürün talebi kayıt hatası:", dbError.message);
      }

      for (const product of recommended) {
        try {
          await dbUrunTalebiKaydet({
            oturumKodu: id,
            urunAdi: product.title,
            kategori: product.category,
            makineTipi: product.machineType,
          });
        } catch (dbError) {
          console.error("SQLite ürün öneri kayıt hatası:", dbError.message);
        }
      }
    }

    session.messages.push({ role: "assistant", content: reply, createdAt: nowIso() });
    session.updatedAt = nowIso();
    saveSessions(sessions);

    await dbMesajKaydet(id, "asistan", reply);

    return res.json({ reply, sessionId: id, showWhatsappButton, whatsappLink, productLinks });

  } catch (error) {
    console.error("CHAT ERROR:", error);
    return res.status(500).json({
      error: "Sohbet sırasında hata oluştu.",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/* ADMIN AUTH */

function checkAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== ADMIN_KEY) return res.status(403).json({ error: "Yetkisiz erişim" });
  next();
}

/* ADMIN ENDPOINTS */

app.get("/admin/sqlite-dashboard", checkAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const oturumSayisi = await db.get(`SELECT COUNT(*) AS adet FROM sohbet_oturumlari`);
    const talepSayisi = await db.get(`SELECT COUNT(*) AS adet FROM musteri_talepleri`);
    const yonlendirmeSayisi = await db.get(`SELECT COUNT(*) AS adet FROM yetkili_yonlendirmeleri`);
    const satisSayisi = await db.get(`SELECT COUNT(*) AS adet FROM satislar`);
    const bugun = new Date().toISOString().slice(0, 10);
    const bugunTalep = await db.get(`SELECT COUNT(*) AS adet FROM musteri_talepleri WHERE olusturulma_tarihi LIKE ?`, [`${bugun}%`]);
    const bugunYonlendirme = await db.get(`SELECT COUNT(*) AS adet FROM yetkili_yonlendirmeleri WHERE olusturulma_tarihi LIKE ?`, [`${bugun}%`]);
    const sonYonlendirmeler = await db.all(`SELECT id, musteri_adi AS customerName, musteri_telefonu AS customerPhone, yonlendirme_etiketi AS handoffReasonLabel, ozet AS summary, olusturulma_tarihi AS createdAt FROM yetkili_yonlendirmeleri ORDER BY id DESC LIMIT 5`);
    res.json({
      totalHandoffs: yonlendirmeSayisi?.adet || 0,
      totalSessions: oturumSayisi?.adet || 0,
      totalLeads: talepSayisi?.adet || 0,
      totalSales: satisSayisi?.adet || 0,
      todayLeads: bugunTalep?.adet || 0,
      todayHandoffs: bugunYonlendirme?.adet || 0,
      recentHandoffs: sonYonlendirmeler || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/sqlite-talepler", checkAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT id, musteri_adi AS customerName, musteri_telefonu AS customerPhone, talep_etiketi AS reasonLabel, aciklama AS detail, durum AS status, olusturulma_tarihi AS createdAt FROM musteri_talepleri ORDER BY id DESC LIMIT 200`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/sqlite-yonlendirmeler", checkAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT id, musteri_adi AS customerName, musteri_telefonu AS customerPhone, yonlendirme_etiketi AS handoffReasonLabel, ozet AS summary, olusturulma_tarihi AS createdAt FROM yetkili_yonlendirmeleri ORDER BY id DESC LIMIT 200`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/sqlite-oturumlar", checkAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const oturumlar = await db.all(`SELECT id, oturum_kodu, olusturulma_tarihi, guncellenme_tarihi, durum FROM sohbet_oturumlari ORDER BY id DESC LIMIT 200`);
    const result = {};
    for (const item of oturumlar) {
      const sonMesaj = await db.get(`SELECT mesaj FROM sohbet_mesajlari WHERE oturum_id = ? ORDER BY id DESC LIMIT 1`, [item.id]);
      result[item.oturum_kodu] = {
        createdAt: item.olusturulma_tarihi,
        updatedAt: item.guncellenme_tarihi,
        messages: sonMesaj ? [{ role: "assistant", content: sonMesaj.mesaj }] : [],
        durum: item.durum,
      };
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/sqlite-talep-durum-guncelle", checkAdmin, async (req, res) => {
  try {
    const { id, status } = req.body;
    const db = await getDb();
    await db.run(`UPDATE musteri_talepleri SET durum = ? WHERE id = ?`, [status, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/satis-ekle", checkAdmin, async (req, res) => {
  try {
    const { musteriAdi, musteriTelefonu, urunAdi, aciklama, tutar, odemeTipi } = req.body;
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO satislar (musteri_adi, musteri_telefonu, urun_adi, aciklama, tutar, odeme_tipi, olusturulma_tarihi) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [musteriAdi || null, musteriTelefonu || null, urunAdi || null, aciklama || null, Number(tutar || 0), odemeTipi || null, nowIso()]
    );
    const satisId = result.lastID;
    const makbuzNo = `IRF-${Date.now()}`;
    await db.run(
      `INSERT INTO makbuzlar (satis_id, makbuz_no, makbuz_tarihi, toplam_tutar, notlar) VALUES (?, ?, ?, ?, ?)`,
      [satisId, makbuzNo, nowIso(), Number(tutar || 0), "Panel üzerinden oluşturuldu"]
    );
    res.json({ success: true, satisId, makbuzNo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/satislar", checkAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT s.id, s.musteri_adi, s.musteri_telefonu, s.urun_adi, s.aciklama, s.tutar, s.para_birimi, s.odeme_tipi, s.durum, s.olusturulma_tarihi, m.makbuz_no, m.makbuz_tarihi FROM satislar s LEFT JOIN makbuzlar m ON m.satis_id = s.id ORDER BY s.id DESC LIMIT 200`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/sqlite-debug", checkAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const tablolar = await db.all(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`);
    res.json({ tamam: true, tablolar });
  } catch (error) {
    res.status(500).json({ tamam: false, error: error.message });
  }
});

/* SAYFALAR */

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/widget-page", (req, res) => res.sendFile(path.join(__dirname, "public", "widget-page.html")));
app.get("/health", (req, res) => res.json({ ok: true, port: PORT, time: nowIso() }));

(async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`🚀 IRFMAK AI çalışıyor: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Veritabanı başlatılamadı:", error);
    process.exit(1);
  }
})();
