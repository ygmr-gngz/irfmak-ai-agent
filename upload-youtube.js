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
