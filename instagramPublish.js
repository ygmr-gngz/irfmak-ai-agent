require('dotenv').config();

const { readTokens } = require('./metaAuth');

const GRAPH_API = 'https://graph.facebook.com/v21.0';

async function pollContainerStatus(containerId, accessToken, maxTries = 30) {
  for (let i = 0; i < maxTries; i++) {
    await new Promise(r => setTimeout(r, 5000));

    const res = await fetch(
      `${GRAPH_API}/${containerId}?fields=status_code,status&access_token=${accessToken}`
    );
    const data = await res.json();

    console.log(`📊 Container durum [${i + 1}/${maxTries}]:`, data.status_code);

    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') {
      throw new Error('Media işleme hatası: ' + (data.status || 'bilinmiyor'));
    }
  }

  throw new Error('Instagram media container zaman aşımına uğradı');
}

// Instagram Reels olarak yayınla
async function publishReelFromUrl(videoUrl, caption) {
  const tokens = readTokens();
  const { instagramAccountId, pageAccessToken } = tokens;

  if (!instagramAccountId || !pageAccessToken) {
    throw new Error('Instagram hesabı bağlı değil. /meta/auth ile bağlantı kurun.');
  }

  console.log('📱 Instagram Reels yükleniyor...');
  console.log('Video URL:', videoUrl.slice(0, 80) + '...');

  // Adım 1: Media container oluştur
  const containerRes = await fetch(`${GRAPH_API}/${instagramAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption,
      share_to_feed: true,
      access_token: pageAccessToken
    })
  });

  const containerData = await containerRes.json();

  if (containerData.error) {
    throw new Error('Container oluşturma hatası: ' + containerData.error.message);
  }

  console.log('📦 Container oluşturuldu:', containerData.id);

  // Adım 2: FINISHED olana kadar bekle
  await pollContainerStatus(containerData.id, pageAccessToken);

  // Adım 3: Yayınla
  const publishRes = await fetch(`${GRAPH_API}/${instagramAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerData.id,
      access_token: pageAccessToken
    })
  });

  const publishData = await publishRes.json();

  if (publishData.error) {
    throw new Error('Yayınlama hatası: ' + publishData.error.message);
  }

  console.log('✅ Instagram Reels yayınlandı:', publishData.id);
  return { mediaId: publishData.id, platform: 'instagram_reels' };
}

// Facebook Sayfasına video yayınla
async function publishToFacebook(videoUrl, caption, title) {
  const tokens = readTokens();
  const { pageId, pageAccessToken } = tokens;

  if (!pageId || !pageAccessToken) {
    throw new Error('Facebook sayfası bağlı değil. /meta/auth ile bağlantı kurun.');
  }

  console.log('📘 Facebook sayfasına video yükleniyor...');

  const res = await fetch(`${GRAPH_API}/${pageId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_url: videoUrl,
      description: caption,
      title: title || 'İrfmak Makina',
      access_token: pageAccessToken
    })
  });

  const data = await res.json();

  if (data.error) {
    throw new Error('Facebook video hatası: ' + data.error.message);
  }

  console.log('✅ Facebook\'a video yüklendi:', data.id);
  return { mediaId: data.id, platform: 'facebook' };
}

function buildSocialCaption(topic) {
  const hashtags = [
    '#dikismakinesi', '#singer', '#pfaff', '#dikiş', '#tekstil',
    '#dikişseverleri', '#hobi', '#terzi', '#moda', '#handmade',
    '#dikismakinesiönerileri', '#singerofficial', '#pfaffofficial',
    '#irfmakmakina', '#dikismakinesitavsiyesi'
  ].join(' ');

  return `${topic}\n\n✂️ Singer ve Pfaff dikiş makineleri, yedek parça ve aksesuar için İrfmak Makina.\n🌐 irfmak.com\n\n${hashtags}`;
}

module.exports = { publishReelFromUrl, publishToFacebook, buildSocialCaption };
