IRFMAK AI Agent
İrfmak için geliştirilen yapay zeka destekli müşteri danışmanı, sohbet widget'ı, ürün öneri sistemi, yetkili yönlendirme akışı ve içerik otomasyonu altyapısıdır.
Bu proje; İrfmak web sitesine gömülebilen bir sohbet widget'ı, müşteri taleplerini takip edebilen bir yönetim paneli ve ürün kataloğuna göre çalışan satış odaklı bir AI asistanı içerir.
İçindekiler

Özellikler
Kullanım Senaryosu
Teknolojiler
Proje Yapısı
Kurulum
Ortam Değişkenleri
Komutlar
API Referansı
AI Asistan Mantığı
Ürün Kataloğu
Widget Kullanımı
İçerik Otomasyonu
YouTube Entegrasyonu
Bilinen Sorunlar ve Dikkat Edilmesi Gerekenler
Geliştirme Notları
Lisans

Özellikler

Yapay zeka destekli müşteri sohbeti
Ürün ihtiyacına göre öneri sistemi
Ev tipi ve sanayi tipi dikiş makineleri için yönlendirme
Yedek parça, iğne, ayak ve tekstil ekipmanı danışmanlığı
Yetkiliye aktarım akışı
Ad soyad ve telefon bilgisi toplama
WhatsApp Business yönlendirmesi
Admin panelinden müşteri taleplerini görüntüleme
Sohbet oturumu takibi
Ürün kataloğu bazlı öneri mantığı
Instagram içerik metni üretimi
YouTube video yükleme altyapısı
Telegram üzerinden içerik onay akışı
iframe / widget mantığıyla dış siteye gömülebilir yapı

Kullanım Senaryosu
Müşteri web sitesine girer ve sohbet widget'ı üzerinden ihtiyacını yazar.
Örnek:

"Ev tipi dikiş makinesi önerir misiniz?"

AI asistan müşterinin ihtiyacını analiz eder, ürün kataloğundan uygun ürünleri önerir ve gerekirse kullanıcıyı ürün sayfasına, ödeme adımına veya yetkili görüşmesine yönlendirir.
Yetkili gerektiren durumlarda sistem müşteriden sırasıyla şu bilgileri toplar:

Talep detayı
Ad soyad bilgisi
Telefon numarası

Bu bilgiler alındıktan sonra WhatsApp üzerinden devam edilebilecek bir bağlantı oluşturulur.
Teknolojiler
KategoriTeknolojiÇalışma zamanıNode.jsWeb çatısıExpress.jsYapay zekaOpenAI APIVeri saklamaSQLite / JSON tabanlı dosya depolamaVeritabanı istemcisiSupabaseEntegrasyonlarGoogle API'leri, YouTube API'leri, Telegram Bot API'siYardımcıdotenv, CORSÖn uçHTML, CSS, JavaScript
Proje Yapısı
irfmak-ai-agent/
├── .github/
│   └── workflows/
├── data/
│   ├── sessions.json
│   └── handoffs.json
├── public/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── admin.html
│   ├── admin.css
│   ├── admin.js
│   ├── widget-page.html
│   └── widget.js
├── tmp/
├── .env.example
├── db.js
├── generate-content.js
├── generate-video.js
├── get-youtube-token.js
├── index.js
├── package.json
├── productCatalog.js
├── reset-data.js
├── supabase.js
├── upload-youtube.js
├── widget-test.html
└── Readme.md
Kurulum

Projeyi klonlayın:

Bashgit clone https://github.com/ygmr-gngz/irfmak-ai-agent.git
cd irfmak-ai-agent

Bağımlılıkları yükleyin:

Bashnpm install

.env.example dosyasını olarak kopyalayın:.env

Bashcp .env.example .env

.env dosyasını kendi bilgilerinizle doldurun (BKZ. Ortam Değişkenleri).
Projeyi çalıştırın:

Bashnpm start

Tarayıcıdan açın:

http://localhost:3000
Ortam Değişkenleri
Temel yapılandırma:
çevreOPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
WHATSAPP_NUMBER=905336370137
ALLOWED_ORIGINS=http://localhost:3000
ADMIN_KEY=change_this_admin_key
NODE_ENV=development
YouTube entegrasyonu için ek değişkenler:
çevreYOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=
YOUTUBE_REFRESH_TOKEN=

ADMIN_KEY değerini production ortamında varsayılan değerden değiştirmeniz önerilir.

Komutlar
KomutAçıklamanpm startSunucuyu başlatırnpm run resetVeri dosyalarını (, ) sıfırlarsessions.jsonhandoffs.json
API Referansı
Sohbet Uç Noktası
POST /chat
Müşteri mesajını AI asistana gönderir.
İstek gövdesi:
JSON{
  "message": "Ev tipi dikiş makinesi önerir misiniz?",
  "sessionId": "optional-session-id"
}
Yanıt:
JSON{
  "reply": "İhtiyacınıza göre öne çıkabilecek seçenekler...",
  "sessionId": "generated-session-id",
  "handoffRequired": false,
  "needContactInfo": false,
  "showWhatsappButton": false,
  "whatsappLink": null
}
Admin Handoff Listesi
GET /admin/handoffs
Yetkiliye aktarılması gereken müşteri taleplerini listeler.
Admin Session Listesi
GET /admin/sessions
Sohbet oturumlarını listeler.
AI Asistan Mantığı
Sistem asistanı şu prensiplerle çalışır:

Kullanıcının ihtiyacını kısa ve net şekilde anlamaya çalışır.
Önce sohbet içinde yardımcı olmaya çalışır.
Ürün önerisi yaparken ürün kataloğunu referans alır.
Bilmediği fiyat, stok veya teknik özellikleri uydurmaz.
Gerekirse kullanıcıdan bütçe, kumaş tipi, kullanım amacı ve kullanım yoğunluğu bilgisi ister.
Yalnızca gerekli durumlarda yetkiliye yönlendirir.

Yetkiliye yönlendirme gerektiren durumlar:

Toplu satış
Bayilik / toptan alım
Özel fiyat talebi
Servis talebi
Arıza
Teknik uyumluluk
Kullanıcının açıkça yetkili istemesi

Ürün Kataloğu
Ürünler dosyasında tutulur.productCatalog.js
Örnek ürün yapısı:
javascript{
  id: "pfaff-passport-3",
  title: "Pfaff Passport 3.0 Elektronik Dikiş Makinesi",
  price: 30500,
  priceText: "30.500 TL",
  category: "ev_tipi",
  machineType: "ev_tipi",
  url: "https://www.irfmak.com/urun/pfaff-passport-3-0-elektronik-dikis-makinesi",
  inStock: true
}
AI öneri sistemi bu katalog üzerinden çalışır.
Widget Kullanımı
Sohbet widget'ı, web sitesine veya script aracılığıyla gömülebilecek şekilde tasarlanmıştır.iframe
Widget tarafında bulunan bileşenler:

Sohbet balonu
Açılır chat paneli
Hızlı cevap butonları
Yeni sohbet başlatma
WhatsApp yönlendirme butonu

İçerik Otomasyonu
generate-content.js dosyası ürün kataloğundan rastgele bir ürün seçerek OpenAI ile Instagram caption, hashtag ve reklam metni üretir.
Üretilen içerik, onay için Telegram üzerinden ilgili kişiye gönderilebilir.
YouTube Entegrasyonu
upload-youtube.js dosyası Google APIs üzerinden YouTube'a video yükleme altyapısı içerir.
Gerekli ortam değişkenleri için bkz. Ortam Değişkenleri.
Bilinen Sorunlar ve Dikkat Edilmesi Gerekenler

Eksik modüller: içinde aşağıdaki dosyalar import edilmektedir:index.js

javascript  const youtubeRouter = require("./youtubeContent");
  const instagramRouter = require("./instagramContent");
youtubeContent.js ve dosyaları repoda mevcut değilse, uygulama çalışma zamanında hata verir. Bu modüller kullanılacaksa ilgili route yapıları tamamlanmalı; kullanılmayacaksa ilgili ve satırları kaldırılmalıdır.instagramContent.jsrequireapp.use

Endpoint uyumsuzluğu: içinde sohbet isteği aşağıdaki production adresine gönderilmektedir:public/app.js

javascript  https://brave-compassion-production.up.railway.app/api/chat
Backend ise endpointini sunmaktadır. Lokal geliştirme için frontend adresi olarak güncellenmeli; production'da ise ile arasında bir proxy/yönlendirme yapılandırılmalı veya endpoint isimleri eşitlenmelidir./chat/chat/api/chat/chat
Geliştirme Notları
Planlanan / önerilen geliştirmeler:

Admin panel için kimlik doğrulama (giriş) sistemi
Supabase ile kalıcı müşteri kayıtları
Ürün stok ve fiyat bilgisinin canlı API'den çekilmesi
Sipariş / ödeme entegrasyonu
WhatsApp Business API entegrasyonu
Instagram otomatik paylaşım
Dashboard grafik ve raporlama
Müşteri segmentasyonu
Çoklu dil desteği
Demiryolu / Render dağıtımı dokümantasyonu
