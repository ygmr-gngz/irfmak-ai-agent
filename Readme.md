# IRF Mak — AI İçerik ve Satış Asistanı

IRF Mak web sitesi için AI destekli satış asistanı ve sosyal medya içerik üreticisi.

---

## Özellikler

| Modül | Açıklama | Endpoint |
|---|---|---|
| **Satış Asistanı** | Web sitesi chat widget'ı — ürün önerisi, handoff akışı | `POST /chat` |
| **YouTube İçerik** | 5 türde video içeriği üretimi | `POST /content/youtube/generate` |
| **Instagram İçerik** | 5 formatta gönderi üretimi | `POST /content/instagram/generate` |
| **İçerik Stüdyosu** | Admin UI | `GET /content-studio.html` |

---

## Kurulum

```bash
npm install
```

`.env` dosyası oluştur:

```env
OPENAI_API_KEY=sk-...

# Instagram otomasyonu için (opsiyonel)
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_USER_ID=...
```

```bash
node index.js
```

Sunucu `http://localhost:3000` adresinde başlar.

---

## Satış Asistanı

Web sitesine embed edilebilir chat widget'ı.

**Özellikler:**
- Bütçe, makine tipi, kumaş türü ve kullanım saatine göre ürün önerisi
- Toplu satış, servis, arıza gibi durumlarda WhatsApp handoff akışı
- Ad, soyad ve telefon toplama
- Session ve handoff kayıtları (`data/` klasöründe JSON)

**Admin endpoint'leri:**
```
GET /admin/handoffs   → Tüm handoff kayıtları
GET /admin/sessions   → Tüm oturumlar
```

---

## YouTube İçerik Modülü

### İçerik Türleri

| Tür | Anahtar |
|---|---|
| Kullanım ve Püf Noktaları | `kullanim_puflari` |
| Arıza Çözümleri ve Bakım | `ariza_cozum` |
| Yeni Başlayanlar Rehberi | `baslangic_rehberi` |
| Ürün İnceleme ve Karşılaştırma | `urun_inceleme` |
| Profesyonel İpuçları | `profesyonel_ipucu` |

### Endpoint'ler

```
GET  /content/youtube/types
GET  /content/youtube/ideas
POST /content/youtube/generate
```

### Örnek İstek

```json
POST /content/youtube/generate
{
  "type": "ariza_cozum",
  "topic": "Dikiş makinesi neden ip atlar?",
  "product": "Singer M3205"
}
```

### Dönen Alanlar

```json
{
  "title": "Video başlığı",
  "description": "YouTube açıklaması",
  "scriptOutline": [{ "timestamp": "0:00", "section": "Giriş", "content": "..." }],
  "keywords": ["..."],
  "hashtags": ["#..."],
  "thumbnailConcept": "Thumbnail fikri",
  "hookLine": "İlk 5 saniye kanca cümlesi",
  "callToAction": "Video sonu CTA"
}
```

---

## Instagram İçerik Modülü

### Format Türleri

| Format | Anahtar |
|---|---|
| Reels | `reels` |
| Karusel Gönderisi | `karusel` |
| Teknik İpucu | `teknik_ipucu` |
| Ürün Tanıtımı | `urun_tanitim` |
| İlham ve Topluluk | `ilham_topluluk` |

### Endpoint'ler

```
GET  /content/instagram/types
GET  /content/instagram/ideas      → 7 günlük haftalık takvim
POST /content/instagram/generate
```

### Örnek İstek

```json
POST /content/instagram/generate
{
  "type": "reels",
  "topic": "Overlok makinesi iplik takma",
  "product": "Singer Elite SE017"
}
```

### Dönen Alanlar (Reels örneği)

```json
{
  "caption": "Kısa açıklama",
  "fullCaption": "Tam açıklama metni",
  "hashtags": ["#..."],
  "reelsScript": [{ "second": "0-3", "visual": "...", "text": "...", "voiceover": "..." }],
  "hookLine": "Kanca cümlesi",
  "audioSuggestion": "Müzik önerisi",
  "textOverlays": ["Ekran yazısı 1"],
  "storyFollowup": "Story takibi fikri",
  "cta": "Call to action"
}
```

### Hashtag Stratejisi

Her üretimde 30 hashtag gelir:
- 5 niş hashtag (`#irfmak`, `#dikişmakinesiservisi` ...)
- 10 orta ölçekli hashtag
- 10 geniş hashtag
- 5 trend / hedef kitle etiketi

---

## Instagram Otomasyonu (Meta Graph API)

Üretilen içerikleri Instagram'a otomatik göndermek için **Meta Graph API** kullanılır.

### Kurulum Adımları

**1. Facebook Developer hesabı aç**
- [developers.facebook.com](https://developers.facebook.com) → Uygulama oluştur → "Business" türü seç

**2. Instagram hesabını hazırla**
- Instagram hesabı **Business veya Creator** olmalı (kişisel hesap çalışmaz)
- Hesabı bir **Facebook Sayfası**'na bağla

**3. App'e izinler ekle**
App Ayarları → Permissions bölümünden şu izinleri iste:
```
instagram_basic
instagram_content_publish
pages_read_engagement
pages_show_list
```

**4. Access Token al**
- Graph API Explorer → Token Oluştur → Long-lived token'a çevir (60 gün geçerli)
- Instagram Business hesabının `user_id`'sini al:
```
GET https://graph.facebook.com/v19.0/me/accounts?access_token=TOKEN
```

**5. `.env` dosyasına ekle**
```env
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token
INSTAGRAM_USER_ID=your_ig_business_user_id
```

### Gönderi Yayınlama Akışı

```
1. Medya Container Oluştur
   POST /{ig-user-id}/media
   → { image_url, caption } veya { video_url, media_type: "REELS" }
   ← creation_id döner

2. Container'ı Yayınla
   POST /{ig-user-id}/media_publish
   → { creation_id }
   ← post_id döner
```

### Medya Barındırma

Görsel ve video dosyaları **herkese açık bir URL'den** çekilmesi gerekir:
- **Cloudinary** (önerilen — ücretsiz plan yeterli)
- AWS S3 (public bucket)
- Herhangi bir CDN

---

## İçerik Stüdyosu (Admin UI)

`http://localhost:3000/content-studio.html` adresinde açılır.

- YouTube / Instagram sekme geçişi
- İçerik türü + konu + opsiyonel ürün girişi
- "Haftalık İçerik Fikirleri" ile otomatik konu önerileri
- Her alanda tek tık kopyalama

---

## Proje Yapısı

```
irfmak-ai-agent/
├── index.js              # Ana sunucu + satış asistanı
├── youtubeContent.js     # YouTube içerik router
├── instagramContent.js   # Instagram içerik router
├── productCatalog.js     # Ürün kataloğu
├── public/
│   ├── index.html        # Chat widget sayfası
│   ├── widget.js         # Embed widget
│   ├── app.js            # Chat frontend
│   ├── style.css         # Stiller
│   └── content-studio.html  # Admin içerik paneli
├── data/
│   ├── sessions.json     # Oturum kayıtları
│   └── handoffs.json     # Handoff kayıtları
├── .env                  # API anahtarları (git'e ekleme)
└── widget-test.html      # Widget test sayfası
```

---

## Teknolojiler

- **Node.js + Express** — sunucu
- **OpenAI GPT-4.1-mini** — AI motor
- **Meta Graph API** — Instagram otomasyonu
- **WhatsApp API** — handoff entegrasyonu
