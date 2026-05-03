# 🤖 İrfmak Yapay Zeka Ajansı + 🎬 AI Video Otomasyon Sistemi

Bu proje, İrfmak Makina için geliştirilmiş iki ana sistemi içerir:

1. 🤖 Yapay zeka destekli müşteri sohbet ve satış sistemi  
2. 🎬 AI ile otomatik video üretim ve YouTube yayın sistemi  

---

# 🤖 AI Agent (Chat + Satış Sistemi)

## Özellikler

- Yapay zeka destekli müşteri sohbeti
- Ürün danışmanlığı
- Yetkiliye yönlendirme
- WhatsApp Business geçişi
- Yönetim paneli
- Müşteri talepleri takibi
- Satış kaydı oluşturma
- Makbuz yazdırma
- SQLite veri yönetimi
- iframe ile siteye gömülebilir widget

---

## Teknolojiler

- Node.js
- Express
- SQLite
- OpenAI API
- HTML / CSS / JavaScript

---

## Proje Yapısı
irfmak-ai-agent/
├── db.js
├── index.js
├── productCatalog.js
├── reset-data.js
├── package.json
├── .env.example
├── data/
└── public/
    ├── index.html
    ├── app.js
    ├── style.css
    ├── admin.html
    ├── admin.css
    ├── admin.js
    ├── widget-page.html
    └── widget.js


---

# 🎬 AI Video Otomasyon Sistemi

Bu sistem:

- OpenAI ile video senaryosu oluşturur
- HeyGen ile video üretir
- YouTube’a otomatik yükler
- Günlük otomasyon çalıştırır

---

## Özellikler

- 🎥 Otomatik video üretimi (HeyGen)
- 🧠 Prompt üretimi (OpenAI)
- 📤 YouTube otomatik upload
- 📅 Günlük içerik planı (auto-daily)
- 🎯 Singer / Pfaff / Mixed içerik üretimi
- 🔥 Hook + subtitle + satış hissi

---

## Video Sistemi Dosyaları
├── generate-heygen-agent-video.js
├── reels-agent-video.js
├── upload-youtube.js
├── auto-run.js
├── auto-daily.js


---

## Kurulum

```bash
git clone https://github.com/USERNAME/irfmak-ai-agent.git
cd irfmak-ai-agent
npm install
.env oluştur:

OPENAI_API_KEY=xxx
HEYGEN_API_KEY=xxx

YOUTUBE_CLIENT_ID=xxx
YOUTUBE_CLIENT_SECRET=xxx
YOUTUBE_REFRESH_TOKEN=xxx
YOUTUBE_REDIRECT_URI=http://localhost:3000

YOUTUBE_PRIVACY=public
Kullanım
Tek video üret + yükle
node auto-run.js "Singer ve Pfaff dikiş makineleri"
Günlük otomasyon
node auto-daily.js
📅 Günlük Plan
Pazartesi → Singer + Pfaff
Salı → Mixed
Çarşamba → Singer + Pfaff
Perşembe → Mixed
Cuma → Singer + Pfaff
Cumartesi → Mixed
Pazar → Mixed
📈 Growth Strategy
Instagram Reels → kısa versiyon
YouTube → uzun versiyon
Story → YouTube link paylaşımı
⚠️ Notlar
Instagram otomasyon için Meta API gereklidir
Story paylaşımı API ile yapılamaz
HeyGen kredi kullanır
🚀 Gelecek Plan
Instagram otomatik paylaşım
AI caption + hashtag sistemi
Thumbnail generator
Short + Long video üretim sistemi
