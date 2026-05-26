require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');

async function uploadVideo(videoPath, title, description, tags = []) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video dosyası bulunamadı: ${videoPath}`);
  }

  const auth = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );

  auth.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
  });

  const youtube = google.youtube({ version: 'v3', auth });

  console.log("YouTube'a yükleniyor:", videoPath);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId: '26',
        defaultLanguage: 'tr'
      },
      status: {
        privacyStatus: process.env.YOUTUBE_PRIVACY || 'private'
      }
    },
    media: {
      body: fs.createReadStream(videoPath)
    }
  });

  const videoUrl = `https://www.youtube.com/watch?v=${res.data.id}`;
  console.log("✅ YouTube'a yüklendi:", videoUrl);

  return videoUrl;
}

module.exports = { uploadVideo };
let res;

try {
  console.log('OAuth debug:', {
    hasClientId: !!process.env.YOUTUBE_CLIENT_ID,
    clientIdStart: process.env.YOUTUBE_CLIENT_ID?.slice(0, 20),
    hasClientSecret: !!process.env.YOUTUBE_CLIENT_SECRET,
    clientSecretStart: process.env.YOUTUBE_CLIENT_SECRET?.slice(0, 8),
    hasRefreshToken: !!process.env.YOUTUBE_REFRESH_TOKEN,
    refreshTokenStart: process.env.YOUTUBE_REFRESH_TOKEN?.slice(0, 6),
    redirectUri: process.env.YOUTUBE_REDIRECT_URI
  });

  res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId: '26',
        defaultLanguage: 'tr'
      },
      status: {
        privacyStatus: process.env.YOUTUBE_PRIVACY || 'private'
      }
    },
    media: {
      body: fs.createReadStream(videoPath)
    }
  });
} catch (err) {
  console.error('YouTube detay hata:', err.response?.data || err.errors || err);
  throw err;
}
