require('dotenv').config();

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3000/meta/callback';
const GRAPH_API = 'https://graph.facebook.com/v21.0';

const tokenFile = path.join(__dirname, 'data', 'meta-tokens.json');

function readTokens() {
  try {
    if (fs.existsSync(tokenFile)) {
      return JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    }
  } catch {}
  return {};
}

function saveTokens(data) {
  const existing = readTokens();
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  fs.writeFileSync(tokenFile, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

// GET /meta/auth — Meta OAuth'a yönlendir
router.get('/auth', (req, res) => {
  if (!META_APP_ID) {
    return res.status(500).json({ error: 'META_APP_ID .env içinde tanımlı değil' });
  }

  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_messages',
    'instagram_manage_comments',
    'business_management'
  ].join(',');

  const authUrl =
    `https://www.facebook.com/v21.0/dialog/oauth` +
    `?client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}` +
    `&scope=${scope}` +
    `&response_type=code`;

  res.redirect(authUrl);
});

// GET /meta/callback — OAuth kodu ile token al
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`<h2>OAuth iptal edildi</h2><p>${error}</p>`);
  }

  if (!code) {
    return res.status(400).send('<h2>Kod bulunamadı</h2>');
  }

  try {
    // Kısa ömürlü token al
    const shortRes = await fetch(
      `${GRAPH_API}/oauth/access_token` +
      `?client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}` +
      `&client_secret=${META_APP_SECRET}` +
      `&code=${code}`
    );
    const shortData = await shortRes.json();

    if (shortData.error) {
      return res.status(400).json({ error: 'Token alınamadı', detail: shortData.error });
    }

    // Uzun ömürlü token al
    const longRes = await fetch(
      `${GRAPH_API}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${shortData.access_token}`
    );
    const longData = await longRes.json();
    const userToken = longData.access_token || shortData.access_token;

    // Bağlı Facebook sayfalarını al
    const pagesRes = await fetch(`${GRAPH_API}/me/accounts?access_token=${userToken}`);
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];
    const firstPage = pages[0] || null;

    let igAccountId = null;

    if (firstPage) {
      const igRes = await fetch(
        `${GRAPH_API}/${firstPage.id}?fields=instagram_business_account&access_token=${firstPage.access_token}`
      );
      const igData = await igRes.json();
      igAccountId = igData.instagram_business_account?.id || null;
    }

    const tokens = saveTokens({
      userAccessToken: userToken,
      pageAccessToken: firstPage?.access_token || null,
      pageId: firstPage?.id || null,
      pageName: firstPage?.name || null,
      instagramAccountId: igAccountId,
      connectedAt: new Date().toISOString()
    });

    res.send(`
      <html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;text-align:center">
        <h2>✅ Meta Bağlantısı Başarılı</h2>
        <p><b>Sayfa:</b> ${tokens.pageName || '-'}</p>
        <p><b>Instagram ID:</b> ${tokens.instagramAccountId || 'Bulunamadı'}</p>
        <p><small>Bu pencereyi kapatabilirsiniz.</small></p>
        <a href="/social-panel.html" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#1877f2;color:#fff;border-radius:6px;text-decoration:none">Admin Panele Git</a>
      </body></html>
    `);
  } catch (err) {
    console.error('Meta OAuth hatası:', err);
    res.status(500).json({ error: 'OAuth başarısız', detail: err.message });
  }
});

// GET /meta/status — Bağlantı durumunu döndür
router.get('/status', (req, res) => {
  const tokens = readTokens();

  if (!tokens.userAccessToken) {
    return res.json({ connected: false });
  }

  res.json({
    connected: true,
    pageName: tokens.pageName || null,
    pageId: tokens.pageId || null,
    instagramAccountId: tokens.instagramAccountId || null,
    connectedAt: tokens.connectedAt || null,
    updatedAt: tokens.updatedAt || null
  });
});

// POST /meta/disconnect — Token dosyasını sil
router.post('/disconnect', (req, res) => {
  if (fs.existsSync(tokenFile)) {
    fs.unlinkSync(tokenFile);
  }
  res.json({ success: true, message: 'Meta bağlantısı kesildi' });
});

module.exports = { router, readTokens, saveTokens };
