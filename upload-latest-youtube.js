require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { uploadVideo } = require('./upload-youtube');

function getLatestMp4(dir = './outputs') {
  if (!fs.existsSync(dir)) {
    throw new Error(`${dir} klasörü bulunamadı.`);
  }

  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.mp4'))
    .map(file => {
      const fullPath = path.join(dir, file);
      return {
        file,
        fullPath,
        mtime: fs.statSync(fullPath).mtimeMs
      };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) {
    throw new Error('outputs içinde .mp4 video bulunamadı.');
  }

  return files[0].fullPath;
}

function getLatestMetadata(dir = './outputs') {
  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const fullPath = path.join(dir, file);
      return {
        file,
        fullPath,
        mtime: fs.statSync(fullPath).mtimeMs
      };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) return null;

  try {
    return JSON.parse(fs.readFileSync(files[0].fullPath, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const videoPath = getLatestMp4('./outputs');
  const metadata = getLatestMetadata('./outputs');

  const title =
    metadata?.title ||
    'İrfmak Makina | Singer ve Pfaff Dikiş Makineleri';

  const description =
    metadata?.description ||
    'İrfmak Makina - Singer ve Pfaff dikiş makineleri, teknik servis ve doğru makine seçimi. irfmak.com';

  const tags =
    metadata?.tags ||
    ['dikiş', 'dikiş makinesi', 'Singer', 'Pfaff', 'İrfmak Makina'];

  console.log('📹 Yüklenecek video:', videoPath);
  console.log('📝 Başlık:', title);

  const url = await uploadVideo(videoPath, title, description, tags);

  console.log('\n🎉 Yükleme tamamlandı:');
  console.log(url);
}

main().catch(error => {
  console.error('\n❌ Upload hatası:', error.message);
  process.exit(1);
});