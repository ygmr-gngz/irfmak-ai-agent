require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('Tarayıcıda şu linki aç:');
console.log(authUrl);

const server = http.createServer(async (req, res) => {
  const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
  const code = qs.get('code');
  
  if (code) {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ REFRESH TOKEN:');
    console.log(tokens.refresh_token);
    console.log('\n.env dosyasına ekle:');
    console.log('YOUTUBE_REFRESH_TOKEN=' + tokens.refresh_token);
    res.end('Token alındı! Terminale bak.');
    server.close();
  }
});

server.listen(3000, () => {
  console.log('\nSunucu başladı, tarayıcıda linki aç...');
});