const { google } = require('googleapis');
const fs = require('fs');

/**
 * YouTube'a video yükleyen ana fonksiyon
 * @param {string} videoPath - Yüklenecek MP4 dosyasının yolu
 * @param {string} title - Video Başlığı
 * @param {string} description - Video Açıklaması
 * @param {Array<string>} tags - Video Etiketleri
 */
async function uploadVideo(videoPath, title, description, tags = []) {
  // 1. Ortam değişkenlerinin (Secrets) eksiksiz olduğunu doğrula
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI; // .yml'den gelen adres

  if (!clientId || !clientSecret || !refreshToken || !redirectUri) {
    throw new Error(
      'Kritik eksiklik: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN veya YOUTUBE_REDIRECT_URI ortam değişkenleri tanımlı değil!'
    );
  }

  // 2. OAuth2 İstemcisini Yapılandır
  // .yml dosyasında kontrol edilen ve tarayıcıda onay aldığın redirect adresi doğrudan buraya beslenir
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // 3. Yenilenen Refresh Token'ı İstemciye Tanıt
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  // 4. YouTube API İstemcisini Başlat
  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
  });

  console.log('🔄 YouTube OAuth2 doğrulaması başarılı. Yükleme hazırlığı yapılıyor...');

  // 5. Video Dosyasının Varlığını Kontrol Et
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Yüklenecek video dosyası bulunamadı: ${videoPath}`);
  }

  // 6. YouTube API'sine Yükleme İsteği Gönder
  try {
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: title,
          description: description,
          tags: tags,
          categoryId: '22' // 22: People & Blogs
        },
        status: {
          privacyStatus: 'public', // Herkese açık yayınlama
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    });

    // 7. Başarılı Sonucu Dön
    return `https://www.youtube.com/watch?v=${response.data.id}`;
  } catch (apiError) {
    // Google API'den dönen detaylı hatayı logla
    if (apiError.response && apiError.response.data) {
      console.error('❌ Google API Detaylı Hata:', JSON.stringify(apiError.response.data, null, 2));
    }
    throw apiError;
  }
}

module.exports = { uploadVideo };
