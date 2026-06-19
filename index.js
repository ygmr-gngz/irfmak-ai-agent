const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { PRODUCT_CATALOG } = require("./productCatalog");
const youtubeRouter = require("./youtubeContent");
const instagramRouter = require("./instagramContent");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WHATSAPP_NUMBER = "905336370137";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/content/youtube", youtubeRouter);
app.use("/content/instagram", instagramRouter);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const dataDir = path.join(__dirname, "data");
const sessionsFile = path.join(dataDir, "sessions.json");
const handoffsFile = path.join(dataDir, "handoffs.json");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(sessionsFile)) {
  fs.writeFileSync(sessionsFile, JSON.stringify({}, null, 2), "utf8");
}
if (!fs.existsSync(handoffsFile)) {
  fs.writeFileSync(handoffsFile, JSON.stringify([], null, 2), "utf8");
}

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

let sessions = readJson(sessionsFile, {});
let handoffs = readJson(handoffsFile, []);

const SYSTEM_PROMPT = `
Sen İrfmak web sitesinin yapay zeka satış danışmanı ve ürün yönlendirme asistanısın.

Temel rolün:
- Kullanıcının ihtiyacını kısa ve net şekilde anlamak
- Önce sohbet içinde yardımcı olmak
- Uygun ürün, kategori veya kullanım bilgisi önermek
- Gerekirse ürün sayfasına veya ödeme adımına yönlendirme teklif etmek
- Yetkiliyi yalnızca gerekli durumlarda yönlendirmek

İrfmak bağlamı:
- Ev tipi dikiş makineleri
- Sanayi tipi dikiş makineleri
- Overlok
- Reçme
- Zigzag
- Çift iğne
- Yedek parça
- Ayak çeşitleri
- Dikiş iğneleri
- Kumaş kesim motorları ve tekstil kesim ekipmanları

Yorumlama kuralları:
- "kesim" denince öncelikle kumaş / tekstil kesimi bağlamında düşün
- ahşap, metal, CNC gibi alakasız alanlara kayma
- "sanayi makinesi" denince tekstil ve dikiş üretim makinelerini düşün
- bilmediğin model, fiyat, stok veya teknik özellik uydurma
- belirsizse kısa netleştirici soru sor

Satış yaklaşımı:
- hemen yetkiliye atma
- önce danışman gibi davran
- bütçe, kullanım amacı, kumaş tipi, kullanım yoğunluğu gibi bilgilere göre yönlendir
- kullanıcı hazırsa ürün sayfasına veya ödeme adımına geçmek isteyip istemediğini sorabilirsin

Yetkiliye devir yalnızca şu durumlarda:
- toplu satış / toptan alım / bayi
- özel fiyat / teklif
- servis
- arıza
- teknik uyumluluk için kesin teyit
- kullanıcı açıkça yetkiliyle görüşmek istediğini söylerse

Handoff akışı:
1. Önce kullanıcıdan konu / ihtiyaç detayını al
2. Sonra ad soyad iste
3. Tek kelimelik isim kabul etme
4. Sonra telefon numarası iste
5. Bilgiler tamamlanınca teşekkür et ve WhatsApp'tan devam butonu göster

Cevap stili:
- kısa
- net
- profesyonel
- sıcak
- satış odaklı
`;

function saveSessions() {
  writeJson(sessionsFile, sessions);
}

function saveHandoffs() {
  writeJson(handoffsFile, handoffs);
}

function createNewSession() {
  const sessionId = crypto.randomUUID();

  sessions[sessionId] = {
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
    ],
    state: {
      handoffRequired: false,
      handoffReason: null,
      handoffReasonText: null,
      awaitingReason: false,
      awaitingName: false,
      awaitingPhone: false,
      customerName: null,
      customerPhone: null,
      handoffCompleted: false,
      collected: {
        budgetLevel: null,
        machineType: null,
        fabricType: null,
        usageHours: null,
        useCase: null,
      },
    },
    createdAt: new Date().toISOString(),
  };

  saveSessions();
  return sessionId;
}

function getSession(sessionId) {
  return sessions[sessionId];
}

function normalizeText(text) {
  return String(text || "").toLocaleLowerCase("tr-TR");
}

function normalizeUserMessage(text) {
  return String(text || "")
    .replace(/\b2o\b/gi, "20")
    .replace(/\b3o\b/gi, "30")
    .replace(/\b4o\b/gi, "40")
    .replace(/\b5o\b/gi, "50")
    .replace(/\b6o\b/gi, "60")
    .replace(/\b7o\b/gi, "70")
    .replace(/\b8o\b/gi, "80")
    .replace(/\b9o\b/gi, "90")
    .replace(/\s+/g, " ")
    .trim();
}

function resetCollectedData(session) {
  session.state.collected = {
    budgetLevel: null,
    machineType: null,
    fabricType: null,
    usageHours: null,
    useCase: null,
  };
}

function resetHandoffState(session) {
  session.state.handoffRequired = false;
  session.state.handoffReason = null;
  session.state.handoffReasonText = null;
  session.state.awaitingReason = false;
  session.state.awaitingName = false;
  session.state.awaitingPhone = false;
  session.state.customerName = null;
  session.state.customerPhone = null;
  session.state.handoffCompleted = false;
}

function isNewSearchIntent(message) {
  const text = normalizeText(message);

  const triggers = [
    "ev tipi",
    "sanayi tipi",
    "sanayi makine",
    "overlok",
    "reçme",
    "recme",
    "zigzag",
    "çift iğne",
    "cift iğne",
    "düz dikiş",
    "duz dikis",
    "kesim",
    "yedek parça",
    "parça lazım",
    "makine arıyorum",
    "makine öner",
    "makinesi öner",
    "iğne lazım",
    "ayak lazım",
    "ütü",
  ];

  return triggers.some((item) => text.includes(item));
}

function detectHandoffReason(message) {
  const text = normalizeText(message);

  if (
    text.includes("yetkiliyle görüşmek istiyorum") ||
    text.includes("yetkili ile görüşmek istiyorum") ||
    text.includes("yetkiliye bağla") ||
    text.includes("temsilciye bağla")
  ) {
    return "yetkili_talebi";
  }

  if (
    text.includes("toplu") ||
    text.includes("toplu alım") ||
    text.includes("toplu satın alma") ||
    text.includes("bayi") ||
    text.includes("toptan") ||
    /\b([1-9][0-9]|[1-9][0-9]{2,})\s*(adet|tane)\b/.test(text)
  ) {
    return "toplu_satis";
  }

  if (
    text.includes("özel fiyat") ||
    text.includes("özel teklif") ||
    text.includes("indirim") ||
    text.includes("iskonto")
  ) {
    return "ozel_fiyat";
  }

  if (text.includes("teklif") || text.includes("fiyat teklifi")) {
    return "teklif";
  }

  if (
    text.includes("uyumlu mu") ||
    text.includes("uyar mı") ||
    text.includes("uyumluluk") ||
    text.includes("bu parça olur mu") ||
    text.includes("bu ayak olur mu") ||
    text.includes("bu makineye uyar mı")
  ) {
    return "teknik_uyumluluk";
  }

  if (text.includes("servis")) return "servis";

  if (
    text.includes("arıza") ||
    text.includes("arızalı") ||
    text.includes("bozuldu") ||
    text.includes("çalışmıyor")
  ) {
    return "ariza";
  }

  return null;
}

function reasonLabel(reason) {
  const labels = {
    yetkili_talebi: "Yetkili ile görüşme talebi",
    toplu_satis: "Toplu satış",
    ozel_fiyat: "Özel fiyat talebi",
    teklif: "Teklif talebi",
    teknik_uyumluluk: "Teknik uyumluluk",
    servis: "Servis talebi",
    ariza: "Arıza / teknik destek",
    ai_yetersiz: "AI yetersiz kaldı",
  };
  return labels[reason] || "Yetkili desteği";
}

function aiSuggestsHandoff(reply) {
  const text = normalizeText(reply);

  const strongTriggers = [
    "toplu alım için yetkili",
    "özel fiyat için yetkili",
    "teklif için yetkili",
    "servis ekibimiz",
    "arıza için teknik destek",
    "bu konuda yetkili ile görüşmeniz gerekir",
  ];

  return strongTriggers.some((item) => text.includes(item));
}

function extractPhoneNumber(text) {
  const match = String(text || "").match(/(\+?\d[\d\s()-]{8,}\d)/);
  return match ? match[0].trim() : null;
}

function cleanPhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function normalizeTurkishPhone(phoneText) {
  return String(phoneText || "").replace(/\D/g, "");
}

function isValidTurkishPhone(phoneText) {
  const normalized = normalizeTurkishPhone(phoneText);
  return /^0\d{10}$/.test(normalized);
}

function looksLikeFullName(text) {
  const cleaned = String(text || "").trim();
  if (cleaned.length < 5) return false;
  if (extractPhoneNumber(cleaned)) return false;

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;

  return parts.every((w) => /^[a-zA-ZçğıöşüÇĞİÖŞÜ]+$/.test(w));
}

function detectBudgetLevel(message) {
  const text = normalizeText(message);

  if (text.includes("düşük bütçe") || text.includes("uygun fiyat")) return "dusuk";
  if (text.includes("orta bütçe")) return "orta";
  if (text.includes("yüksek bütçe") || text.includes("üst segment")) return "yuksek";

  const match = text.match(/(\d{4,6})\s*(tl|₺)?/i);
  if (!match) return null;

  const amount = Number(match[1]);
  if (amount <= 15000) return "dusuk";
  if (amount <= 30000) return "orta";
  return "yuksek";
}

function detectMachineTypes(message) {
  const text = normalizeText(message);
  const found = [];

  if (text.includes("ev tipi")) found.push("ev_tipi");
  if (text.includes("overlok")) found.push("overlok");
  if (text.includes("reçme") || text.includes("recme")) found.push("recme");
  if (text.includes("zigzag")) found.push("zigzag");
  if (text.includes("çift iğne") || text.includes("cift iğne")) found.push("cift_igne");
  if (text.includes("düz dikiş") || text.includes("duz dikis")) found.push("duz_dikis");
  if (text.includes("kesim")) found.push("kesim");
  if (
    text.includes("parça") ||
    text.includes("yedek parça") ||
    text.includes("ayak") ||
    text.includes("mekik") ||
    text.includes("masura") ||
    text.includes("iğne")
  ) {
    found.push("parca");
  }

  if (text.includes("sanayi tipi") || text.includes("sanayi makinesi")) {
    if (found.length === 0) found.push("sanayi_genel");
  }

  return [...new Set(found)];
}

function detectFabricType(message) {
  const text = normalizeText(message);
  const fabrics = [
    "saten",
    "penye",
    "pamuk",
    "kot",
    "deri",
    "ince kumaş",
    "kalın kumaş",
    "örme kumaş",
    "esnek kumaş",
    "kumaş",
  ];
  return fabrics.find((f) => text.includes(f)) || null;
}

function detectUsageHours(message) {
  const text = normalizeText(message);
  const match = text.match(/(\d{1,2})\s*(saat)/i);
  if (match) return Number(match[1]);
  return null;
}

function collectSessionData(session, message) {
  const machineTypes = detectMachineTypes(message);
  const budgetLevel = detectBudgetLevel(message);
  const fabricType = detectFabricType(message);
  const usageHours = detectUsageHours(message);

  if (machineTypes.length > 0) session.state.collected.machineType = machineTypes;
  if (budgetLevel) session.state.collected.budgetLevel = budgetLevel;
  if (fabricType) session.state.collected.fabricType = fabricType;
  if (usageHours) session.state.collected.usageHours = usageHours;
}

function getBudgetLabel(level) {
  if (level === "dusuk") return "düşük bütçe";
  if (level === "orta") return "orta bütçe";
  if (level === "yuksek") return "yüksek bütçe";
  return "belirtilmemiş bütçe";
}

function productMatchesType(product, requestedTypes) {
  if (!requestedTypes || requestedTypes.length === 0) return true;

  for (const t of requestedTypes) {
    if (t === "sanayi_genel") {
      if (
        product.category.startsWith("sanayi_") ||
        ["overlok", "recme", "zigzag", "cift_igne", "duz_dikis"].includes(product.machineType)
      ) {
        return true;
      }
    }

    if (t === "ev_tipi" && product.machineType === "ev_tipi") return true;
    if (t === "overlok" && product.machineType === "overlok") return true;
    if (t === "recme" && product.machineType === "recme") return true;
    if (t === "zigzag" && product.machineType === "zigzag") return true;
    if (t === "cift_igne" && product.machineType === "cift_igne") return true;
    if (t === "duz_dikis" && product.machineType === "duz_dikis") return true;
    if (t === "kesim" && product.machineType === "kesim") return true;
    if (t === "parca" && (product.machineType === "parca" || product.machineType === "igne")) return true;
  }

  return false;
}

function scoreProduct(product, collected) {
  let score = 0;

  if (collected.budgetLevel && product.budgetLevel === collected.budgetLevel) score += 3;

  if (
    collected.fabricType &&
    product.fabricTypes.some((f) => collected.fabricType.includes(f) || f.includes(collected.fabricType))
  ) {
    score += 2;
  }

  if (collected.usageHours) {
    if (collected.usageHours >= 6 && product.machineType !== "ev_tipi") score += 2;
    if (collected.usageHours < 6 && product.machineType === "ev_tipi") score += 1;
  }

  return score;
}

function recommendProducts(collected) {
  const requestedTypes = collected.machineType || [];
  let filtered = PRODUCT_CATALOG.filter((p) => productMatchesType(p, requestedTypes));

  if (filtered.length === 0) filtered = PRODUCT_CATALOG;

  return filtered
    .map((p) => ({ ...p, _score: scoreProduct(p, collected) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);
}

function buildProductRecommendationReply(session) {
  const collected = session.state.collected;
  const recommended = recommendProducts(collected);
  if (!recommended || recommended.length === 0) return null;

  const intro = [];
  if (collected.machineType?.length) intro.push(`Makine tipi: ${collected.machineType.join(", ")}`);
  if (collected.fabricType) intro.push(`Kumaş tipi: ${collected.fabricType}`);
  if (collected.budgetLevel) intro.push(`Bütçe seviyesi: ${getBudgetLabel(collected.budgetLevel)}`);
  if (collected.usageHours) intro.push(`Günlük kullanım: ${collected.usageHours} saat`);

  const listText = recommended
    .map((p, i) => `${i + 1}. ${p.title} (${p.priceText})`)
    .join("\n");

  return `${intro.length ? intro.join(" | ") + "\n\n" : ""}İhtiyacınıza göre öne çıkabilecek seçenekler:

${listText}

İsterseniz bu seçeneklerden birine göre ürün sayfasına yönlendirebilirim. Hazırsanız ödeme adımına geçmeniz için de uygun yönlendirme yapabilirim.`;
}

function summarizeForHandoff(session) {
  const state = session.state;
  const msgs = session.messages.filter((m) => m.role !== "system");
  const userMessages = msgs.filter((m) => m.role === "user").map((m) => m.content);

  const firstUser = userMessages[0] || "-";
  const lastUser = userMessages[userMessages.length - 1] || "-";

  return `
Talep: ${firstUser}
Kategori: ${reasonLabel(state.handoffReason)}
Müşteri Açıklaması: ${state.handoffReasonText || "-"}
Son Mesaj: ${lastUser}
`.trim();
}

function getLastMessages(messages, count = 4) {
  return messages
    .filter((m) => m.role !== "system")
    .slice(-count)
    .map((m) => `${m.role === "user" ? "Müşteri" : "Asistan"}: ${m.content}`);
}

function generateCustomerWhatsAppLink(session) {
  const state = session.state;
  const text = `
Merhaba, ben ${state.customerName}.
Siteniz üzerinden bilgi bıraktım.

Konu: ${state.handoffReasonText || reasonLabel(state.handoffReason)}
`.trim();

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function storeHandoff(sessionId) {
  const session = getSession(sessionId);
  const state = session.state;

  const existing = handoffs.find(
    (item) =>
      item.sessionId === sessionId &&
      item.customerPhone === state.customerPhone &&
      item.completed === true
  );

  if (existing) return existing;

  const record = {
    id: crypto.randomUUID(),
    sessionId,
    customerName: state.customerName,
    customerPhone: state.customerPhone,
    handoffReason: state.handoffReason,
    handoffReasonLabel: reasonLabel(state.handoffReason),
    handoffReasonText: state.handoffReasonText,
    summary: summarizeForHandoff(session),
    lastMessages: getLastMessages(session.messages, 4),
    customerWhatsappLink: generateCustomerWhatsAppLink(session),
    completed: true,
    createdAt: new Date().toISOString(),
  };

  handoffs.push(record);
  saveHandoffs();

  return record;
}

function finalizeHandoff(currentSessionId, session) {
  const handoffRecord = storeHandoff(currentSessionId);

  session.state.handoffCompleted = true;
  session.state.awaitingReason = false;
  session.state.awaitingName = false;
  session.state.awaitingPhone = false;

  return {
    reply: "Teşekkür ederim. Bilgilerinizi aldım. Yetkilimiz en kısa sürede sizinle iletişime geçecektir.",
    handoffRequired: true,
    needContactInfo: false,
    showWhatsappButton: true,
    whatsappLink: handoffRecord.customerWhatsappLink,
  };
}

function handoffNeedDetected(message, session) {
  const detected = detectHandoffReason(message);
  if (!detected) return null;

  session.state.handoffRequired = true;
  session.state.handoffReason = detected;
  session.state.awaitingReason = true;
  session.state.awaitingName = false;
  session.state.awaitingPhone = false;
  session.state.handoffReasonText = null;
  session.state.customerName = null;
  session.state.customerPhone = null;
  session.state.handoffCompleted = false;

  return {
    reply:
      "Bu konuda sizi yetkilimize iletmem daha doğru olur. Hangi özellikte ürün istediğinizi ve ne için alım yapacağınızı kısaca paylaşır mısınız?",
    handoffRequired: true,
    needContactInfo: true,
    showWhatsappButton: false,
    whatsappLink: null,
  };
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin/handoffs", (req, res) => {
  res.json(handoffs);
});

app.get("/admin/sessions", (req, res) => {
  res.json(sessions);
});

app.post("/chat", async (req, res) => {
  try {
    const rawMessage = req.body.message;
    const message = normalizeUserMessage(rawMessage || "");
    const { sessionId } = req.body;

    if (!message.trim()) {
      return res.status(400).json({ error: "Mesaj gerekli" });
    }

    let currentSessionId = sessionId;
    if (!currentSessionId || !sessions[currentSessionId]) {
      currentSessionId = createNewSession();
    }

    let session = getSession(currentSessionId);
    if (!session || !session.messages || !session.state) {
      currentSessionId = createNewSession();
      session = getSession(currentSessionId);
    }

    if (isNewSearchIntent(message)) {
      resetCollectedData(session);
      resetHandoffState(session);
    }

    collectSessionData(session, message);

    const state = session.state;

    session.messages.push({
      role: "user",
      content: message,
    });

    let result = null;

    if (!state.awaitingReason && !state.awaitingName && !state.awaitingPhone) {
      const directHandoff = handoffNeedDetected(message, session);
      if (directHandoff) result = directHandoff;
    }

    if (!result && state.awaitingReason && !state.handoffReasonText) {
      if (message.trim().length < 3) {
        result = {
          reply: "Kısaca hangi özellikte ve ne amaçla alım yapmak istediğinizi yazar mısınız?",
          handoffRequired: true,
          needContactInfo: true,
          showWhatsappButton: false,
        };
      } else {
        state.handoffReasonText = message.trim();
        state.awaitingReason = false;
        state.awaitingName = true;

        result = {
          reply: "Teşekkür ederim. Şimdi ad soyad bilginizi paylaşabilir misiniz?",
          handoffRequired: true,
          needContactInfo: true,
          showWhatsappButton: false,
        };
      }
    }

    if (!result && state.awaitingName && !state.customerName) {
      if (!looksLikeFullName(message.trim())) {
        result = {
          reply: "Ad soyad bilginizi ad ve soyad olacak şekilde paylaşır mısınız? Örneğin: Ahmet Yılmaz",
          handoffRequired: true,
          needContactInfo: true,
          showWhatsappButton: false,
        };
      } else {
        state.customerName = message.trim();
        state.awaitingName = false;
        state.awaitingPhone = true;

        result = {
          reply: `Teşekkür ederim ${state.customerName}. Şimdi telefon numaranızı paylaşabilir misiniz?`,
          handoffRequired: true,
          needContactInfo: true,
          showWhatsappButton: false,
        };
      }
    }

    if (!result && state.awaitingPhone && !state.customerPhone) {
      const normalizedPhone = normalizeTurkishPhone(message);

      if (isValidTurkishPhone(message)) {
        state.customerPhone = normalizedPhone;
        result = finalizeHandoff(currentSessionId, session);
      } else {
        result = {
          reply: "Telefon numaranızı 11 haneli ve başında 0 olacak şekilde paylaşabilir misiniz? Örneğin: 0555 333 22 11",
          handoffRequired: true,
          needContactInfo: true,
          showWhatsappButton: false,
        };
      }
    }

    if (!result) {
      const localRecommendation = buildProductRecommendationReply(session);
      const recentMessages = session.messages.slice(-20);

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          ...recentMessages,
          {
            role: "system",
            content: localRecommendation
              ? `Yerel ürün öneri notu:\n${localRecommendation}\n\nBunu uygunsa doğal bir cevap olarak kullan.`
              : "Yerel ürün öneri notu yok.",
          },
        ],
      });

      const reply =
        response.choices?.[0]?.message?.content ||
        localRecommendation ||
        "Şu anda yanıt üretemedim.";

      if (!state.handoffRequired && aiSuggestsHandoff(reply)) {
        state.handoffRequired = true;
        if (!state.handoffReason) {
          state.handoffReason = detectHandoffReason(message) || "ai_yetersiz";
        }

        state.awaitingReason = true;

        const forcedReply =
          "Bu konuda sizi yetkilimize iletmem daha doğru olur. Hangi özellikte ürün istediğinizi ve ne için alım yapacağınızı kısaca paylaşır mısınız?";

        session.messages.push({
          role: "assistant",
          content: forcedReply,
        });

        saveSessions();

        return res.json({
          reply: forcedReply,
          sessionId: currentSessionId,
          handoffRequired: true,
          needContactInfo: true,
          showWhatsappButton: false,
          whatsappLink: null,
        });
      }

      session.messages.push({
        role: "assistant",
        content: reply,
      });

      saveSessions();

      return res.json({
        reply,
        sessionId: currentSessionId,
        handoffRequired: false,
        needContactInfo: false,
        showWhatsappButton: false,
        whatsappLink: null,
      });
    }

    session.messages.push({
      role: "assistant",
      content: result.reply,
    });

    saveSessions();

    return res.json({
      reply: result.reply,
      sessionId: currentSessionId,
      handoffRequired: result.handoffRequired || false,
      needContactInfo: result.needContactInfo || false,
      showWhatsappButton: result.showWhatsappButton || false,
      whatsappLink: result.whatsappLink || null,
    });
  } catch (error) {
    console.error("CHAT HATASI:", error);
    res.status(500).json({ error: "Sunucuda hata oluştu" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server çalışıyor: http://0.0.0.0:${PORT}`);
});
