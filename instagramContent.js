const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { PRODUCT_CATALOG } = require("./productCatalog");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONTENT_TYPES = {
  reels: {
    label: "Reels",
    icon: "🎬",
    description: "Kısa dikey video için metin, altyazı ve sahne planı",
  },
  karusel: {
    label: "Karusel Gönderisi",
    icon: "📱",
    description: "Çok slaytlı eğitim veya bilgi paylaşımı",
  },
  teknik_ipucu: {
    label: "Teknik İpucu",
    icon: "🔧",
    description: "Tek kare pratik bilgi paylaşımı",
  },
  urun_tanitim: {
    label: "Ürün Tanıtımı",
    icon: "⭐",
    description: "Ürün değer ve özellik vurgusu",
  },
  ilham_topluluk: {
    label: "İlham ve Topluluk",
    icon: "💫",
    description: "Müşteri hikayeleri, önce-sonra, motivasyon",
  },
};

const BRAND_VOICE = `
IRF Mak Instagram marka sesi:
- Sıcak, samimi ve ulaşılabilir
- Uzman ama gösterişsiz — abi/abla gibi konuş
- Türk dikiş topluluğuna yakın, yerel dil kullan
- Öğretici ama asla sıkıcı değil
- Emoji ile renklendirme yapabilirsin ama abartma
- "Kaydet", "Paylaş", "Takip et" gibi aksiyona yönlendiren kelimeler kullan
`;

const HASHTAG_NOTE = `
Hashtag stratejisi (toplam 30 adet):
- 5 niş hashtag (çok özgül, az kullanılan): #irfmak, #dikişipuçları, #dikişmakinesiservisi vb.
- 10 orta ölçekli hashtag: #dikişmakinesi, #overlok, #dikişseverler vb.
- 10 geniş ölçekli hashtag: #dikiş, #handmade, #tekstil vb.
- 5 trend/mevsimsel hashtag veya hedef kitle etiketi
`;

function buildPrompt(type, topic, product) {
  const productLine = product ? `Öne çıkan ürün: ${product}\n` : "";

  const typeInstructions = {
    reels: `
Format: Instagram Reels (dikey video, 15-60 saniye)
Hedef: İlk 3 saniyede hook — izleyiciyi durdurup sona kadar izlet.
Yapı: Hook cümlesi (sesli ve yazılı) → Ana bilgi/değer (hızlı tempolu) → CTA

JSON:
{
  "caption": "İlk 125 karakterde izleyiciyi durduran açıklama (emoji içerebilir)",
  "fullCaption": "Tam açıklama: merak uyandıran açılış + içerik özeti + kaydet/paylaş teşviki + CTA soru. ~300 karakter.",
  "hashtags": ["#tag1", "#tag2"],
  "reelsScript": [
    { "second": "0-3", "visual": "Görsel açıklama", "text": "Ekran yazısı", "voiceover": "Sesli anlatım" }
  ],
  "hookLine": "İlk 3 saniye ekranda gösterilecek kanca cümle",
  "audioSuggestion": "Önerilen müzik tipi veya ses efekti",
  "textOverlays": ["Ekrandaki yazı 1", "Ekrandaki yazı 2", "Ekrandaki yazı 3"],
  "storyFollowup": "Bu Reels'i destekleyecek Story fikri",
  "cta": "Son karede izleyiciye yöneltilecek aksiyon"
}
`,
    karusel: `
Format: Instagram Karusel (5-8 slayt)
Hedef: "Kaydet" butonu — izleyiciye dönüp bakacağı değerli içerik ver.
Yapı: Kapak slayt (click-bait başlık) → Değer slaytları → Özet → CTA slayt

JSON:
{
  "caption": "Karusel açıklaması — 'Kaydet' teşviki ve içerik sürprizi içermeli. ~200 karakter.",
  "fullCaption": "Tam açıklama: içerik değeri + 'sonraki slaytlarda gör' + kaydet teşviki + soru CTA.",
  "hashtags": ["#tag1", "#tag2"],
  "slides": [
    { "slideNumber": 1, "type": "cover", "title": "Kapak başlığı", "subtitle": "Alt başlık", "designNote": "Renk/görsel önerisi" },
    { "slideNumber": 2, "type": "content", "title": "Slayt başlığı", "content": "Slayt metni (kısa, okunabilir)", "designNote": "Görsel önerisi" }
  ],
  "coverDesign": "Kapak slayt renk paleti, font ve görsel önerisi",
  "saveHook": "İzleyiciyi kaydetmeye teşvik eden cümle",
  "storyFollowup": "Story takibi fikri",
  "cta": "Son slayt CTA metni"
}
`,
    teknik_ipucu: `
Format: Tek kare statik gönderi veya minimal video
Hedef: Hızla okunabilir, kaydedilmeye değer bir teknik bilgi.
Yapı: Soru/sorun başlığı → Kısa cevap → Görsel destekli açıklama

JSON:
{
  "caption": "Merak uyandıran soru veya şaşırtıcı bilgi. ~150 karakter.",
  "fullCaption": "İpucunun detayı + 'bunu biliyor muydun?' tonu + kaydet teşviki + soru CTA.",
  "hashtags": ["#tag1", "#tag2"],
  "postHeadline": "Görselde büyük puntolu ana başlık",
  "postSubtext": "Görselde küçük açıklama metni (1-2 satır)",
  "visualDescription": "Görsel tasarım önerisi: arka plan, renkler, ikonlar",
  "storyFollowup": "Bu gönderinin Story versiyonu (anket veya quiz ile)",
  "cta": "Yorum veya kaydet odaklı CTA"
}
`,
    urun_tanitim: `
Format: Ürün odaklı gönderi (tekil kare, karusel veya kısa video olabilir)
Hedef: İzleyicide "bunu istiyorum" duygusu yaratmak — satış baskısı hissettirmeden.
Yapı: Ürünü doğal ortamda göster → Değer öner → Kime uygun? → Nereden alınır?

JSON:
{
  "caption": "Ürünün en güçlü özelliğini öne çıkaran açılış. ~150 karakter.",
  "fullCaption": "Ürün değeri + hedef kitle + özellik vurgusu + 'linkteki siteden incele' tonu + soru CTA.",
  "hashtags": ["#tag1", "#tag2"],
  "keySellingPoints": ["Satış noktası 1", "Satış noktası 2", "Satış noktası 3"],
  "targetProfile": "Bu ürünü kimin alması gerektiği (karakter tanımı)",
  "visualDescription": "Ürünün nasıl fotoğraflanacağı / video çekileceği",
  "objectionHandle": "İzleyicinin aklındaki en büyük engeli aşacak bir cümle",
  "storyFollowup": "Story'de ürünü nasıl tanıtacağız (anket, quiz, 'bu kim için?' sorusu)",
  "cta": "Satışa yönlendiren ama baskısız CTA"
}
`,
    ilham_topluluk: `
Format: İlham verici gönderi (müşteri hikayesi, önce-sonra, motivasyon, duygu)
Hedef: "Ben de yapabilirim" veya "IRF Mak beni anlıyor" duygusu uyandır.
Yapı: Duygusal açılış → Hikaye → Değer mesajı → Topluluk daveti

JSON:
{
  "caption": "Duygu yüklü, bağ kuran açılış cümlesi. ~150 karakter.",
  "fullCaption": "Hikaye veya ilham mesajı + marka değeri + topluluk daveti + yorum sorusu.",
  "hashtags": ["#tag1", "#tag2"],
  "storyAngle": "Hangi açıdan anlatılacak — müşteri hikayesi mi, dönüşüm mü, motivasyon mu",
  "visualDescription": "Fotoğraf veya video önerisi (gerçek, sahici, filtreli değil)",
  "emotionalHook": "İzleyiciyi içeriğe bağlayacak duygu tetikleyici",
  "engagementQuestion": "Yorumları artıracak soru (kişisel deneyimi davet et)",
  "ugcAsk": "Kullanıcı üretimli içerik talebi (müşteri paylaşım daveti)",
  "storyFollowup": "Story'de bu gönderiye nasıl devam edilir",
  "cta": "Topluluk hissi yaratan, satış yapmadan bağ kuran CTA"
}
`,
  };

  return `
Sen IRF Mak'ın Instagram içerik stratejistisin.
${BRAND_VOICE}
${HASHTAG_NOTE}
${typeInstructions[type]}
Konu: "${topic}"
${productLine}
Tam olarak belirtilen JSON formatında Türkçe içerik üret. JSON dışında hiçbir şey yazma.
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
Sen IRF Mak'ın Instagram içerik stratejistisin.
${BRAND_VOICE}
Kataloğun bir kısmı: ${productSample}

Bir haftalık Instagram içerik takvimi oluştur. Yalnızca tanıtım değil — eğitici, ilham verici, topluluk kurucu içerikler ağırlıklı olsun.
Her gün için format, konu ve hedef belirt.

JSON:
{
  "weeklyCalendar": [
    {
      "day": "Pazartesi",
      "type": "reels | karusel | teknik_ipucu | urun_tanitim | ilham_topluluk",
      "typeLabel": "Türkçe format adı",
      "topic": "Gönderi konusu",
      "hook": "İlk cümle fikri",
      "targetAudience": "Bu gönderinin hedef izleyicisi",
      "engagementGoal": "Beğeni mi, kaydet mi, yorum mu, paylaş mı hedefleniyor",
      "bestPostTime": "Önerilen paylaşım saati (TR için)"
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
    console.error("Instagram ideas error:", error);
    res.status(500).json({ error: "İçerik takvimi üretilemedi" });
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
      temperature: 0.9,
    });

    const data = JSON.parse(response.choices[0].message.content);

    res.json({
      platform: "instagram",
      type,
      typeLabel: CONTENT_TYPES[type].label,
      topic,
      product: product || null,
      ...data,
    });
  } catch (error) {
    console.error("Instagram generate error:", error);
    res.status(500).json({ error: "İçerik üretilemedi" });
  }
});

module.exports = router;
module.exports.CONTENT_TYPES = CONTENT_TYPES;
