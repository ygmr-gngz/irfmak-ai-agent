# IRF Mak — AI İçerik ve Satış Asistanı

IRF Mak web sitesi için geliştirilmiş, yapay zeka destekli satış asistanı ve sosyal medya içerik üretim platformu.

## İçindekiler

- [Özellikler](#özellikler)
- [Kurulum](#kurulum)
- [Satış Asistanı](#satış-asistanı)
- [YouTube İçerik Modülü](#youtube-içerik-modülü)
- [Instagram İçerik Modülü](#instagram-içerik-modülü)
- [Instagram Otomasyonu (Meta Graph API)](#instagram-otomasyonu-meta-graph-api)
- [İçerik Stüdyosu (Admin UI)](#içerik-stüdyosu-admin-ui)
- [Proje Yapısı](#proje-yapısı)
- [Kullanılan Teknolojiler](#kullanılan-teknolojiler)

## Özellikler

| Modül | Açıklama | Uç Nokta |
|-------|----------|----------|
| Satış Asistanı | Web sitesi sohbet widget'ı — ürün önerisi ve WhatsApp yönlendirme akışı | `POST /chat` |
| YouTube İçerik | 5 farklı türde video içeriği üretimi | `POST /content/youtube/generate` |
| Instagram İçerik | 5 farklı formatta gönderi içeriği üretimi | `POST /content/instagram/generate` |
| İçerik Stüdyosu | Yönetici (admin) arayüzü | `GET /content-studio.html` |

## Kurulum

### 1. Bağımlılıkları yükleyin

```bash
npm install
```

### 2. Ortam değişkenlerini tanımlayın

Proje kök dizininde bir `.env` dosyası oluşturun:

```env
OPENAI_API_KEY=sk-...

# Instagram otomasyonu için (opsiyonel)
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_USER_ID=...
```

### 3. Sunucuyu başlatın

```bash
node index.js
```

Sunucu varsayılan olarak şu adreste çalışır: **http://localhost:3000**

## Satış Asistanı

Web sitesine kolayca entegre edilebilen sohbet widget'ı.

### Özellikler

- Bütçe, makine tipi, kumaş türü ve kullanım süresine göre kişiselleştirilmiş ürün önerileri
- Toplu satış, servis talebi veya arıza durumlarında WhatsApp üzerinden insan desteğine yönlendirme akışı
- Yönlendirme sürecinde ad, soyad ve telefon bilgisi toplama
- Oturum ve yönlendirme kayıtlarının `data/` klasöründe JSON formatında saklanması

### Yönetici Uç Noktaları

| Uç Nokta | Açıklama |
|----------|----------|
| `GET /admin/handoffs` | Tüm yönlendirme (handoff) kayıtlarını döndürür |
| `GET /admin/sessions` | Tüm sohbet oturumlarını döndürür |

## YouTube İçerik Modülü

### İçerik Türleri

| İçerik Türü | Anahtar |
|-------------|---------|
| Kullanım ve Püf Noktaları | `kullanim_puflari` |
| Arıza Çözümleri ve Bakım | `ariza_cozum` |
| Yeni Başlayanlar Rehberi | `baslangic_rehberi` |
| Ürün İnceleme ve Karşılaştırma | `urun_inceleme` |
| Profesyonel İpuçları | `profesyonel_ipucu` |

### Uç Noktalar

```
GET  /content/youtube/types
GET  /content/youtube/ideas
POST /content/youtube/generate
```

### Örnek İstek

```http
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
  "scriptOutline": [
    { "timestamp": "0:00", "section": "Giriş", "content": "..." }
  ],
  "keywords": ["..."],
  "hashtags": ["#..."],
  "thumbnailConcept": "Thumbnail fikri",
  "hookLine": "İlk 5 saniye kanca cümlesi",
  "callToAction": "Video sonu CTA"
}
```

## Instagram İçerik Modülü

### Format Türleri

| Format Türü | Anahtar |
|-------------|---------|
| Makaralar (Reels) | `reels` |
| Karusel Gönderisi | `karusel` |
| Teknik İpucu | `teknik_ipucu` |
| Ürün Tanıtımı | `urun_tanitim` |
| İlham ve Topluluk | `ilham_topluluk` |

### Uç Noktalar

```
GET  /content/instagram/types
GET  /content/instagram/ideas      → 7 günlük haftalık takvim
POST /content/instagram/generate
```

### Örnek İstek

```http
POST /content/instagram/generate
{
  "type": "reels",
  "topic": "Overlok makinesi iplik takma",
  "product": "Singer Elite SE017"
}
```

### Dönen Alanlar (Reels Örneği)

```json
{
  "caption": "Kısa açıklama",
  "fullCaption": "Tam açıklama metni",
  "hashtags": ["#..."],
  "reelsScript": [
    { "second": "0-3", "visual": "...", "text": "...", "voiceover": "..." }
  ],
  "hookLine": "Kanca cümlesi",
  "audioSuggestion": "Müzik önerisi",
  "textOverlays": ["Ekran yazısı 1"],
  "storyFollowup": "Story takibi fikri",
  "cta": "Call to action"
}
```

### Hashtag Stratejisi

Her üretimde toplam **30 hashtag** oluşturulur:

1. 5 niş hashtag (örn. `#irfmak`, `#dikişmakinesiservisi`)
2. 10 orta ölçekli hashtag
3. 10 geniş kapsamlı hashtag
4. 5 trend / hedef kitle odaklı etiket

## Instagram Otomasyonu (Meta Graph API)

Üretilen içeriklerin Instagram'a otomatik gönderilmesi için Meta Graph API kullanılır.

### Kurulum Adımları

1. **Facebook Developer hesabı açın**
   `developers.facebook.com` → Uygulama oluştur → **"Business"** türünü seçin

2. **Instagram hesabınızı hazırlayın**
   Hesap, Business veya Creator türünde olmalı (kişisel hesaplar çalışmaz) ve bir Facebook Sayfası'na bağlanmalıdır

3. **Uygulamaya izinleri ekleyin**
   App Ayarları → Permissions bölümünden şu izinleri isteyin:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_show_list`

4. **Erişim token'ı alın**
   Graph API Explorer → Token Oluştur → Long-lived token'a çevirin (60 gün geçerli)
   Instagram Business hesabının `user_id`'sini almak için:
   ```
   GET https://graph.facebook.com/v19.0/me/accounts?access_token=TOKEN
   ```

5. **`.env` dosyasına ekleyin**
   ```env
   INSTAGRAM_ACCESS_TOKEN=your_long_lived_token
   INSTAGRAM_USER_ID=your_ig_business_user_id
   ```

### Gönderi Yayınlama Akışı

**1. Medya Konteyneri Oluştur**
```
POST /{ig-user-id}/media
→ { image_url, caption } veya { video_url, media_type: "REELS" }
← creation_id döner
```

**2. Konteyneri Yayınla**
```
POST /{ig-user-id}/media_publish
→ { creation_id }
← post_id döner
```

### Medya Barındırma

Görsel ve video dosyaları herkese açık bir URL'den erişilebilir olmalıdır:

- **Cloudinary** (önerilen — ücretsiz plan yeterli)
- **AWS S3** (genel/public kova)
- Herhangi bir CDN

## İçerik Stüdyosu (Admin UI)

`http://localhost:3000/content-studio.html` adresinden erişilir.

- YouTube / Instagram sekme geçişi
- İçerik türü + konu + opsiyonel ürün girişi
- "Haftalık İçerik Fikirleri" ile otomatik konu önerileri
- Her alanda tek tık kopyalama

## Proje Yapısı

```
irfmak-ai-agent/
├── index.js              # Ana sunucu + satış asistanı
├── youtubeContent.js     # YouTube içerik router
├── instagramContent.js   # Instagram içerik router
├── productCatalog.js     # Ürün kataloğu
├── public/
│   ├── index.html        # Chat widget sayfası
│   ├── widget.js          # Embed widget
│   ├── app.js             # Chat frontend
│   ├── style.css          # Stiller
│   └── content-studio.html  # Admin içerik paneli
├── data/
│   ├── sessions.json     # Oturum kayıtları
│   └── handoffs.json     # Handoff kayıtları
├── .env                  # API anahtarları (git'e eklenmemeli)
└── widget-test.html      # Widget test sayfası
```

## Kullanılan Teknolojiler

- **Node.js + Express** — sunucu
- **OpenAI GPT-4.1-mini** — AI motor
- **Meta Graph API** — Instagram otomasyonu
- **WhatsApp API** — handoff entegrasyonu
