require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { publishReelFromUrl, publishToFacebook, buildSocialCaption } = require('./instagramPublish');
const { readTokens } = require('./metaAuth');

const metaFile = path.join(__dirname, 'outputs', 'last_video_meta.json');

function readLastVideoMeta() {
  try {
    if (fs.existsSync(metaFile)) {
      return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    }
  } catch {}
  return null;
}

async function main() {
  const topic = process.argv.slice(2).join(' ') || 'Singer ve Pfaff dikiş makineleri';

  const meta = readLastVideoMeta();

  if (!meta || !meta.videoUrl) {
    console.warn('⚠️  outputs/last_video_meta.json bulunamadı veya videoUrl yok. Sosyal paylaşım atlandı.');
    return;
  }

  const tokens = readTokens();

  if (!tokens.connected && !tokens.userAccessToken) {
    console.warn('⚠️  Meta bağlantısı yok. Sosyal paylaşım atlandı. /meta/auth ile bağlanın.');
    return;
  }

  const caption = buildSocialCaption(topic);
  const results = [];

  // Instagram Reels
  if (tokens.instagramAccountId) {
    try {
      const ig = await publishReelFromUrl(meta.videoUrl, caption);
      results.push(ig);
      console.log('✅ Instagram Reels yayınlandı:', ig.mediaId);
    } catch (err) {
      console.error('❌ Instagram Reels hatası:', err.message);
    }
  } else {
    console.warn('⚠️  Instagram hesabı bağlı değil, Reels atlandı.');
  }

  // Facebook
  if (tokens.pageId) {
    try {
      const fb = await publishToFacebook(meta.videoUrl, caption, topic);
      results.push(fb);
      console.log('✅ Facebook\'a yüklendi:', fb.mediaId);
    } catch (err) {
      console.error('❌ Facebook video hatası:', err.message);
    }
  } else {
    console.warn('⚠️  Facebook sayfası bağlı değil, FB paylaşımı atlandı.');
  }

  console.log(`\n📊 Sosyal medya sonucu: ${results.length} platform başarılı`);
}

main().catch(err => {
  console.error('\n❌ publish-social hatası:', err.message);
  process.exit(1);
});
