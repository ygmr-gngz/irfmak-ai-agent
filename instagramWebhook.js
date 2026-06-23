require('dotenv').config();

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { readTokens } = require('./metaAuth');
const { saveLead } = require('./crmLeads');

const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'irfmak_webhook_2025';
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

const AUTO_REPLY =
  'Merhaba, ilginiz için teşekkür ederiz. Singer ve Pfaff dikiş makineleri, yedek parçalar ve aksesuarlar hakkında detaylı bilgi almak için ürün modelini yazabilirsiniz. Size en kısa sürede yardımcı olacağız.';

const TRIGGER_KEYWORDS = [
  'fiyat', 'fiyatı', 'bilgi', 'singer', 'pfaff',
  'dikiş makinesi', 'dikis makinesi', 'dikiş', 'makine',
  'yedek parça', 'yedek parca', 'aksesuar',
  'ne kadar', 'kaça', 'satın', 'almak istiyorum', 'model',
  'servis', 'teknik', 'arıza'
];

function containsTrigger(text) {
  const lower = (text || '').toLowerCase();
  return TRIGGER_KEYWORDS.some(kw => lower.includes(kw));
}

function verifySignature(rawBody, sigHeader) {
  if (!META_APP_SECRET) return true;
  if (!sigHeader) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  return sigHeader === expected;
}

// GET /webhook/instagram — Meta webhook doğrulama
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Instagram webhook doğrulandı');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️  Webhook doğrulama başarısız. Token:', token);
  res.status(403).send('Forbidden');
});

// POST /webhook/instagram — Gelen DM olaylarını işle
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = req.body;
  const sig = req.headers['x-hub-signature-256'];

  if (!verifySignature(rawBody, sig)) {
    console.warn('⚠️  Geçersiz webhook imzası');
    return res.status(401).send('Invalid signature');
  }

  // Meta 200 bekler, işlemi sonra yap
  res.status(200).send('EVENT_RECEIVED');

  let body;
  try {
    body = JSON.parse(rawBody.toString());
  } catch {
    return;
  }

  if (body.object !== 'instagram' && body.object !== 'page') return;

  for (const entry of (body.entry || [])) {
    for (const event of (entry.messaging || [])) {
      if (!event.message || event.message.is_echo) continue;

      const senderId = event.sender?.id;
      const text = event.message?.text || '';

      if (!senderId || !text.trim()) continue;

      console.log(`📩 Instagram DM [${senderId}]: ${text.slice(0, 100)}`);

      if (containsTrigger(text)) {
        const matched = TRIGGER_KEYWORDS.filter(kw => text.toLowerCase().includes(kw));

        await sendDMReply(senderId, AUTO_REPLY);

        await saveLead({
          source: 'instagram_dm',
          platform_user_id: senderId,
          message: text,
          auto_replied: true,
          keywords_matched: matched
        });
      }
    }
  }
});

async function sendDMReply(recipientId, message) {
  const tokens = readTokens();
  const accessToken = tokens.pageAccessToken;

  if (!accessToken) {
    console.error('❌ Page access token yok, DM gönderilemedi');
    return;
  }

  try {
    const res = await fetch(`${GRAPH_API}/me/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: accessToken
      })
    });

    const data = await res.json();

    if (data.error) {
      console.error('❌ DM gönderme hatası:', data.error.message);
    } else {
      console.log('✅ Instagram otomatik DM gönderildi:', recipientId);
    }
  } catch (err) {
    console.error('❌ DM gönderme exception:', err.message);
  }
}

module.exports = router;
