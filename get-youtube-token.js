const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = '586372922050-ekd2i3tm2i4u22k34vmemjt45489g9va.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
});

console.log('\nBu linki aç:\n');
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nCode değerini yapıştır: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\nREFRESH TOKEN:\n');
    console.log(tokens.refresh_token);
  } catch (err) {
    console.error(err.message);
  }

  rl.close();
});
