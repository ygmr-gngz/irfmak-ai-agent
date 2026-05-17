# İrfmak Yapay Zeka Sistemi

<div align="center">

![İrfmak AI](https://img.shields.io/badge/İrfmak-AI%20System-blue?style=for-the-badge&logo=robot&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)

**İrfmak Makina için geliştirilmiş yapay zeka destekli müşteri yönetim ve otomatik video üretim sistemi.**

</div>

---

## 📌 İçindekiler

- [Genel Bakış](#-genel-bakış)
- [Sistem 1 — AI Satış Ajanı](#-sistem-1--ai-satış-ajanı)
- [Sistem 2 — AI Video Otomasyon](#-sistem-2--ai-video-otomasyon)
- [Proje Yapısı](#-proje-yapısı)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [Günlük İçerik Planı](#-günlük-i̇çerik-planı)
- [Büyüme Stratejisi](#-büyüme-stratejisi)
- [Yol Haritası](#-yol-haritası)
- [Önemli Notlar](#-önemli-notlar)

---

## 🔭 Genel Bakış

Bu proje iki bağımsız ama birbirini tamamlayan sistemden oluşur:

| Sistem | Amaç | Teknolojiler |
|--------|------|--------------|
| 🤖 AI Satış Ajanı | Müşteri sohbeti, ürün danışmanlığı, satış takibi | Node.js, OpenAI, SQLite |
| 🎬 Video Otomasyon | Senaryo üretimi, video oluşturma, YouTube yükleme | HeyGen, OpenAI, YouTube API |

---

## 🤖 Sistem 1 — AI Satış Ajanı

Müşteri sorularını yanıtlayan, ürün öneren ve satış sürecini uçtan uca yöneten yapay zeka ajanı.

### Özellikler

- 💬 Yapay zeka destekli gerçek zamanlı müşteri sohbeti
- 🛒 Ürün kataloğu entegrasyonu ve akıllı öneri sistemi
- 📱 WhatsApp Business geçiş yönlendirmesi
- 👤 Yetkili temsilciye yönlendirme akışı
- 🖥️ Yönetim paneli (admin dashboard)
- 📋 Müşteri talepleri ve satış kaydı takibi
- 🧾 Otomatik makbuz yazdırma
- 🗄️ SQLite tabanlı yerel veri yönetimi
- 🔗 iframe ile herhangi bir siteye gömülebilir widget

### Teknoloji Yığını

- **Backend:** Node.js, Express
- **Veritabanı:** SQLite
- **Yapay Zeka:** OpenAI API (GPT)
- **Frontend:** HTML, CSS, Vanilla JavaScript

---

## 🎬 Sistem 2 — AI Video Otomasyon

Sıfırdan video senaryosu üreten, avatar videosu render eden ve YouTube'a otomatik olarak yükleyen tam otomasyon sistemi.

### Özellikler

- 🧠 OpenAI ile ürün odaklı video senaryosu üretimi
- 🎥 HeyGen ile AI avatar video render
- 📤 YouTube Data API ile otomatik yükleme
- 📅 Gün bazlı içerik planlaması (`auto-daily`)
- 🎯 Singer / Pfaff / Karma içerik kategorileri
- 🔥 Hook, altyazı ve satış odaklı senaryo yapısı

---

## 📁 Proje Yapısı

```
irfmak-ai-agent/
│
├── 📦 Çekirdek (AI Agent)
│   ├── index.js                  # Ana sunucu / Express uygulaması
│   ├── db.js                     # SQLite bağlantısı ve şema
│   ├── productCatalog.js         # Ürün kataloğu verileri
│   ├── reset-data.js             # Veritabanı sıfırlama aracı
│   └── package.json
│
├── 🌐 Arayüz (public/)
│   ├── index.html                # Ana chat arayüzü
│   ├── app.js                    # Chat istemci mantığı
│   ├── style.css
│   ├── admin.html                # Yönetim paneli
│   ├── admin.js
│   ├── admin.css
│   ├── widget-page.html          # Widget önizleme sayfası
│   └── widget.js                 # Gömülebilir widget kodu
│
├── 🎬 Video Otomasyon
│   ├── generate-heygen-agent-video.js   # HeyGen video üretici
│   ├── reels-agent-video.js             # Reels formatı üretici
│   ├── upload-youtube.js                # YouTube yükleyici
│   ├── auto-run.js                      # Tekil çalıştırma
│   └── auto-daily.js                    # Günlük zamanlayıcı
│
├── 🗄️ data/                      # SQLite veritabanı dosyaları
└── .env.example
```

---

## ⚙️ Kurulum

### 1. Depoyu Klonla

```bash
git clone https://github.com/USERNAME/irfmak-ai-agent.git
cd irfmak-ai-agent
```

### 2. Bağımlılıkları Yükle

```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarla

`.env.example` dosyasını kopyalayarak `.env` oluştur ve değerleri doldur:

```bash
cp .env.example .env
```

```env
# Yapay Zeka
OPENAI_API_KEY=sk-...

# Video Üretim
HEYGEN_API_KEY=...

# YouTube API
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
YOUTUBE_REDIRECT_URI=http://localhost:3000

# Yayın Ayarı: public | unlisted | private
YOUTUBE_PRIVACY=public
```

### 4. Sunucuyu Başlat

```bash
node index.js
```

---

## 🚀 Kullanım

### Tekil Video Üret ve YouTube'a Yükle

```bash
node auto-run.js "Singer ve Pfaff dikiş makineleri"
```

### Günlük Otomasyonu Başlat

```bash
node auto-daily.js
```

---

## 📅 Günlük İçerik Planı

| Gün | İçerik Kategorisi |
|-----|-------------------|
| Pazartesi | Singer + Pfaff |
| Salı | Karma |
| Çarşamba | Singer + Pfaff |
| Perşembe | Karma |
| Cuma | Singer + Pfaff |
| Cumartesi | Karma |
| Pazar | Karma |

---

## 📈 Büyüme Stratejisi

```
YouTube (uzun format)
    └── Instagram Reels (kısa format)
            └── Story → YouTube link yönlendirmesi
```

Her video üç farklı kanalda optimize edilmiş formatta yayımlanacak şekilde planlanmıştır.

---

## 🗺️ Yol Haritası

- [ ] Instagram otomatik Reels paylaşımı (Meta API)
- [ ] AI destekli caption ve hashtag üretimi
- [ ] Otomatik thumbnail oluşturucu
- [ ] Kısa + uzun format paralel video üretimi
- [ ] Çok dilli içerik desteği

---

## ⚠️ Önemli Notlar

> **Instagram Otomasyonu:** Meta Graph API erişimi ve onaylı bir uygulama gerektirir. Story paylaşımı API üzerinden desteklenmemektedir.

> **HeyGen:** Her video üretimi kredi tüketir. Kullanım öncesinde kota kontrolü yapılması önerilir.

> **YouTube Refresh Token:** Token'ın süresi dolabileceğinden periyodik olarak yenilenmelidir.

---

<div align="center">

Geliştirici katkılarına açıktır. PR ve issue'lar memnuniyetle karşılanır.

**İrfmak Makina — Dikiş'te Güvenilir Adres**

</div>
