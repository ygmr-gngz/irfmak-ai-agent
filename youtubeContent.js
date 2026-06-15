const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { PRODUCT_CATALOG } = require("./productCatalog");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONTENT_TYPES = {
  kullanim_puflari: {
    label: "Kullanım ve Püf Noktaları",
    icon: "✂️",
    description: "Dikiş makinesi kullanımı ve pratik ipuçları",
  },
  ariza_cozum: {
    label: "Arıza Çözümleri ve Bakım",
    icon: "🔧",
    description: "Sorun giderme ve periyodik bakım rehberi",
  },
  baslangic_rehberi: {
    label: "Yeni Başlayanlar Rehberi",
    icon: "📚",
    description: "Sıfırdan başlayan kullanıcılar için adım adım rehber",
  },
  urun_inceleme: {
    label: "Ürün İnceleme ve Karşılaştırma",
    icon: "⭐",
    description: "Detaylı ürün incelemeleri ve model karşılaştırmaları",
  },
  profesyonel_ipucu: {
    label: "Profesyonel İpuçları",
    icon: "🎯",
    description: "İleri seviye teknik bilgiler ve profesyonel teknikler",
  },
};

const BRAND_CONTEXT = `
IRF Mak hakkında:
- Türkiye'de dikiş makineleri, overlok, reçme ve tekstil ekipmanları satan güvenilir bir marka
- Hem ev tipi hem sanayi tipi makineler satar
- Teknik servis ve satış sonrası destek sunar
- Başlıca ürünler: Singer, Pfaff marka ev tipi makineler; sanayi tipi düz dikiş, overlok, reçme, zigzag, çift iğne makineleri
- Hedef kitle: Ev dikiş hobicileri, terziler, tekstil atölyeleri, küçük işletmeler
`;

function buildPrompt(type, topic, product) {
  const productLine = product ? `Öne çıkan ürün: ${product}\n` : "";

  const typeInstructions = {
    kullanim_puflari: `
İçerik tipi: Dikiş makinesi kullanımı ve püf noktaları
Hedef: İzleyiciye pratik, uygulanabilir bir bilgi veya beceri öğret.
Ton: Samimi, öğretici, teşvik edici.
Video yapısı: Giriş hook → Problem/ihtiyaç → Adım adım çözüm → Sonuç/demo → CTA
`,
    ariza_cozum: `
İçerik tipi: Arıza çözümleri ve bakım videoları
Hedef: Yaygın bir makine sorununu teşhis edip çözmesini öğret; servis talebine zemin hazırla.
Ton: Güven veren, teknik ama anlaşılır.
Video yapısı: Sorunun tarifi → Olası sebepler → Adım adım teşhis → Çözüm → "Bu işe yaramazsa IRF Mak servisini ara" CTA
`,
    baslangic_rehberi: `
İçerik tipi: Yeni başlayanlar için rehber içerikler
Hedef: Hiç deneyimi olmayan birine temel bir konuyu sıfırdan anlat; güven ver.
Ton: Sabırlı, cesaretlendirici, yavaş tempolu.
Video yapısı: "Bugün şunu öğreneceğiz" → Malzeme listesi → Her adımı yavaş anlat → Tekrar et → Tebrik + bir sonraki adım CTA
`,
    urun_inceleme: `
İçerik tipi: Ürün incelemeleri ve karşılaştırmalar
Hedef: Satın alma kararı aşamasındaki kullanıcıya dürüst, değer odaklı rehberlik et.
Ton: Dürüst, karşılaştırmalı, satış baskısı olmadan ikna edici.
Video yapısı: Ürünü tanıt → Kutu açılışı / ilk izlenim → Özellikler → Test / demo → Artılar/eksiler → Kime uygun? → Fiyat/değer → Satın alma linki CTA
`,
    profesyonel_ipucu: `
İçerik tipi: Profesyonel ipuçları ve teknik bilgiler
Hedef: Orta-ileri seviye kullanıcıya mesleki değer katan bilgi ver; otorite oluştur.
Ton: Uzman, otoriter, detay odaklı.
Video yapısı: "Çoğu kişinin bilmediği..." hook → Teknik arka plan → Detaylı açıklama → Demo → Profesyonel tüyo → Kanal aboneliği CTA
`,
  };

  return `
Sen IRF Mak'ın YouTube içerik stratejistisin.
${BRAND_CONTEXT}
${typeInstructions[type]}
Konu: "${topic}"
${productLine}
Aşağıdaki JSON formatında Türkçe içerik üret:
{
  "title": "60 karakter altında, SEO uyumlu, merak uyandıran başlık",
  "description": "YouTube açıklaması — ilk 2 satır anahtar kelime yoğun (izleyici 'daha fazla' tıklamadan görür), sonra içerik özeti, IRF Mak web sitesi ve WhatsApp satır sonu yer tutucusu bırak. Toplam ~400 karakter.",
  "scriptOutline": [
    { "timestamp": "0:00", "section": "Giriş / Hook", "content": "Ne söylenecek" },
    { "timestamp": "0:45", "section": "Bölüm adı", "content": "Ne söylenecek" }
  ],
  "keywords": ["anahtar", "kelime", "listesi", "10 adet"],
  "hashtags": ["#hashtag1", "#hashtag2"],
  "thumbnailConcept": "Thumbnail için görsel ve metin önerisi (ne renk, ne yazı, hangi sahne)",
  "hookLine": "İlk 5 saniyede izleyiciyi kaybetmemek için söylenecek açılış cümlesi",
  "callToAction": "Videonun sonunda izleyiciye yöneltilecek CTA"
}
JSON dışında hiçbir şey yazma.
`;
}

router.get("/types", (req, res) => {
  res.json({ types: CONTENT_TYPES });
});

router.get("/ideas", async (req, res) => {
  try {
    const productSample = PRODUCT_CATALOG.slice(0, 6)
      .map((p) => p.title)
      .join(", ");

    const prompt = `
Sen IRF Mak'ın YouTube içerik stratejistisin.
${BRAND_CONTEXT}
Kataloğun bir kısmı: ${productSample}

Beş farklı içerik kategorisi için birer video fikri üret. Tanıtım videosu değil — eğitici, bilgilendirici veya sorun çözücü içerikler olsun.

JSON formatında döndür:
{
  "ideas": [
    {
      "type": "kullanim_puflari | ariza_cozum | baslangic_rehberi | urun_inceleme | profesyonel_ipucu",
      "typeLabel": "Türkçe kategori adı",
      "title": "Video başlığı",
      "summary": "1 cümlelik özet",
      "targetAudience": "Hedef izleyici",
      "estimatedDuration": "Tahmini süre (dk)",
      "whyNow": "Neden bu konu şimdi ilgi çeker"
    }
  ]
}
JSON dışında hiçbir şey yazma.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    res.json(JSON.parse(response.choices[0].message.content));
  } catch (error) {
    console.error("YouTube ideas error:", error);
    res.status(500).json({ error: "İçerik fikirleri üretilemedi" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const { type, topic, product } = req.body;

    if (!type || !topic) {
      return res.status(400).json({ error: "type ve topic zorunludur" });
    }

    if (!CONTENT_TYPES[type]) {
      return res.status(400).json({ error: "Geçersiz içerik tipi" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: buildPrompt(type, topic, product) }],
      response_format: { type: "json_object" },
      temperature: 0.85,
    });

    const data = JSON.parse(response.choices[0].message.content);

    res.json({
      platform: "youtube",
      type,
      typeLabel: CONTENT_TYPES[type].label,
      topic,
      product: product || null,
      ...data,
    });
  } catch (error) {
    console.error("YouTube generate error:", error);
    res.status(500).json({ error: "İçerik üretilemedi" });
  }
});

module.exports = router;
module.exports.CONTENT_TYPES = CONTENT_TYPES;
