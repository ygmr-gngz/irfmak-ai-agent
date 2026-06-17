<div align="center">

# IRFMAK AI Agent

**İrfmak için yapay zeka destekli satış danışmanı**

Dikiş makineleri ve tekstil ekipmanı sektörüne özel; ürün öneri motoru, yetkili aktarım akışı ve içerik otomasyonunu tek bir altyapıda birleştiren AI ajanı.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4.1--mini-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Deploy](https://img.shields.io/badge/Railway-deployed-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://irfmak-ai-agent-production.up.railway.app)

</div>

---

## Ne Yapar?

Müşteri web sitesine girer ve sohbet widget'ı üzerinden ihtiyacını yazar:

> _"Ev tipi dikiş makinesi önerir misiniz?"_

Sistem üç aşamada çalışır:

```
Mesaj alınır → Katalogdan eşleşme yapılır → Yanıt verilir veya yetkili devreye girer
```

Yetkili aktarımı gerektiğinde (toplu satış, servis, arıza vb.) müşteriden sırasıyla talep detayı, ad soyad ve telefon alınır; ardından WhatsApp Business üzerinden devam bağlantısı oluşturulur.

---

## Özellikler

```
Müşteri Deneyimi          Admin & Otomasyon           Entegrasyonlar
─────────────────         ──────────────────          ──────────────
✓ AI sohbet danışmanı     ✓ Oturum takibi             ✓ WhatsApp Business
✓ Ürün öneri motoru       ✓ Yetkili talep listesi     ✓ YouTube Data API
✓ Hızlı cevap butonları   ✓ Instagram içerik üretimi  ✓ Telegram Bot
✓ WhatsApp yönlendirme    ✓ Telegram onay akışı       ✓ Google APIs
✓ iframe / script embed   ✓ Video yükleme altyapısı   ✓ Supabase
```

---

## Teknoloji Yığını

| Katman | Teknoloji | Notlar |
|---|---|---|
| Çalışma ortamı | Node.js 18+ | |
| Web çatısı | Express.js | REST API |
| Yapay zeka | OpenAI API | GPT-4.1-mini |
| Veri saklama | SQLite · JSON · Supabase | Oturum ve aktarım kayıtları |
| Entegrasyonlar | Google APIs · YouTube · Telegram Bot | |
| Ön uç | HTML · CSS · Vanilla JS | Bağımlılık yok |

---

## Proje Yapısı

```
irfmak-ai-agent/
│
├── public/                     # Ön uç
│   ├── index.html              # Ana sohbet arayüzü
│   ├── app.js                  # İstemci mantığı
│   ├── style.css
│   ├── admin.html              # Yönetim paneli
│   ├── admin.js
│   ├── admin.css
│   ├── widget-page.html        # Widget önizleme
│   └── widget.js               # Gömülebilir widget
│
├── data/
│   ├── sessions.json           # Aktif sohbet oturumları
│   └── handoffs.json           # Yetkili aktarım kayıtları
│
├── index.js                    # Uygulama giriş noktası
├── productCatalog.js           # Ürün kataloğu
├── db.js                       # Veri erişim katmanı
├── supabase.js                 # Supabase istemcisi
│
├── generate-content.js         # Instagram içerik üretici
├── generate-video.js           # Video üretim altyapısı
├── upload-youtube.js           # YouTube yükleme modülü
├── get-youtube-token.js        # OAuth token yönetimi
│
├── reset-data.js               # Veri sıfırlama aracı
├── widget-test.html            # Widget test sayfası
├── .env.example
└── package.json
```

---

## Kurulum

### Gereksinimler

- Node.js 18+
- npm 9+
- OpenAI API anahtarı

### Adımlar

```bash
# 1. Repoyu klonlayın
git clone https://github.com/ygmr-gngz/irfmak-ai-agent.git
cd irfmak-ai-agent

# 2. Bağımlılıkları yükleyin
npm install

# 3. Ortam değişkenlerini yapılandırın
cp .env.example .env
# .env dosyasını düzenleyin (aşağıya bakın)

# 4. Çalıştırın
npm start
```

`http://localhost:3000` adresini açın.

---

## Ortam Değişkenleri

### Zorunlu

```env
OPENAI_API_KEY=           # OpenAI API anahtarı
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
WHATSAPP_NUMBER=905336370137
ALLOWED_ORIGINS=http://localhost:3000
ADMIN_KEY=                # Production'da güçlü bir değer seçin
NODE_ENV=development
```

### YouTube Entegrasyonu (opsiyonel)

```env
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=
YOUTUBE_REFRESH_TOKEN=
```

> [!WARNING]
> `ADMIN_KEY` değerini production ortamında varsayılandan mutlaka değiştirin.

---

## Komutlar

```bash
npm start        # Sunucuyu başlatır
npm run reset    # sessions.json ve handoffs.json dosyalarını sıfırlar
```

---

## API

### `POST /chat`

Müşteri mesajını AI asistana iletir.

**İstek**
```json
{
  "message": "Ev tipi dikiş makinesi önerir misiniz?",
  "sessionId": "optional-session-id"
}
```

**Yanıt**
```json
{
  "reply": "İhtiyacınıza göre öne çıkabilecek seçenekler...",
  "sessionId": "generated-session-id",
  "handoffRequired": false,
  "needContactInfo": false,
  "showWhatsappButton": false,
  "whatsappLink": null
}
```

---

### `GET /admin/handoffs`

Yetkili aktarımı bekleyen müşteri taleplerini döndürür.

```
Authorization: x-admin-key: <ADMIN_KEY>
```

---

### `GET /admin/sessions`

Aktif ve geçmiş sohbet oturumlarını listeler.

```
Authorization: x-admin-key: <ADMIN_KEY>
```

---

## AI Asistan Davranışı

### Temel Kurallar

- Kullanıcının ihtiyacını net anlamadan öneri yapmaz
- Katalogda olmayan fiyat, stok veya teknik bilgi uydurmaz
- Gerekirse bütçe, kumaş tipi, kullanım amacı, kullanım yoğunluğu sorar
- Yalnızca gerekli durumlarda yetkili aktarımı başlatır

### Yetkili Aktarımı Tetikleyen Durumlar

| Durum | Örnek |
|---|---|
| Toplu / toptan alım | "50 adet sipariş vereceğiz" |
| Bayilik talebi | "Distribütörlük yapmak istiyorum" |
| Özel fiyat görüşmesi | "Kurumsal fiyat alabilir miyim?" |
| Servis / arıza | "Makinam çalışmıyor" |
| Teknik uyumluluk | "Bu model şu kumaşı diker mi?" |
| Açık talep | "Yetkiliyle görüşmek istiyorum" |

---

## Ürün Kataloğu

Tüm ürünler `productCatalog.js` dosyasında tanımlanır. AI öneri motoru bu katalog üzerinden çalışır; harici kaynak kullanmaz.

```js
// Örnek ürün yapısı
{
  id: "pfaff-passport-3",
  title: "Pfaff Passport 3.0 Elektronik Dikiş Makinesi",
  price: 30500,
  priceText: "30.500 TL",
  category: "ev_tipi",
  machineType: "ev_tipi",
  url: "https://www.irfmak.com/urun/pfaff-passport-3-0-elektronik-dikis-makinesi",
  inStock: true
}
```

---

## Widget Entegrasyonu

Widget, herhangi bir web sayfasına `iframe` veya harici script aracılığıyla eklenir.

**Script ile ekleme**
```html
<script src="https://irfmak-ai-agent-production.up.railway.app/widget.js"></script>
```

Widget arayüzü şunları içerir:
- Tetikleyici sohbet balonu
- Açılır chat paneli
- Hızlı cevap butonları
- Yeni sohbet başlatma
- WhatsApp yönlendirme butonu

---

## İçerik Otomasyonu

`generate-content.js`, ürün kataloğundan rastgele bir ürün seçerek OpenAI aracılığıyla üretir:

- Instagram caption
- Hashtag seti
- Reklam metni

Üretilen içerik onay için Telegram Bot üzerinden ilgili kişiye iletilir; onay sonrasında yayına alınabilir.

---

## YouTube Entegrasyonu

`upload-youtube.js`, Google APIs üzerinden YouTube'a programatik video yükleme sağlar. Gerekli OAuth yapılandırması için [Ortam Değişkenleri](#ortam-değişkenleri) bölümüne bakın.

---

## Bilinen Sorunlar

### Eksik modüller

`index.js` şu anda var olmayan iki modülü import etmektedir:

```js
const youtubeRouter = require("./youtubeContent");
const instagramRouter = require("./instagramContent");
```

Bu dosyalar repoda bulunmadığından uygulama çalışma zamanında hata verir.

**Çözüm:** Modüller kullanılacaksa route yapıları tamamlanmalı; kullanılmayacaksa ilgili `require` ve `app.use` satırları kaldırılmalıdır.

---

### Endpoint uyumsuzluğu

`public/app.js` şu adrese istek gönderir:

```
POST https://brave-compassion-production.up.railway.app/api/chat
```

Backend ise `/chat` endpoint'ini sunar.

**Çözüm:** Yerel geliştirmede frontend adresi `/chat` olarak güncellenmeli; production'da proxy yapılandırılmalı veya endpoint isimleri eşleştirilmelidir.

---

## Yol Haritası

- [ ] Admin paneli kimlik doğrulama sistemi
- [ ] Supabase ile kalıcı müşteri kayıtları  
- [ ] Ürün stok ve fiyat bilgisinin canlı API'den çekilmesi
- [ ] Sipariş / ödeme entegrasyonu
- [ ] WhatsApp Business API entegrasyonu
- [ ] Instagram otomatik paylaşım
- [ ] Dashboard grafik ve raporlama
- [ ] Müşteri segmentasyonu
- [ ] Çoklu dil desteği
- [ ] Railway / Render dağıtım dokümantasyonu

---

## Katkıda Bulunanlar

<a href="https://github.com/ygmr-gngz">
  <img src="https://github.com/ygmr-gngz.png" width="40" style="border-radius:50%">
</a>

**[@ygmr-gngz](https://github.com/ygmr-gngz)** — Yağmur Güngöz

---

<div align="center">
  <sub>Production · <a href="https://irfmak-ai-agent-production.up.railway.app">irfmak-ai-agent-production.up.railway.app</a></sub>
</div>
