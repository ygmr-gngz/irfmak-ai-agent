require('dotenv').config();
const { generateHeygenVideo } = require('./generate-heygen-video');

const testScript = "Merhaba, ben İrfmak Makina'nın yapay zeka asistanıyım. Size en uygun dikiş makinesini bulmak için buradayım.";

generateHeygenVideo(
  testScript,
  process.env.HEYGEN_AVATAR_ID,
  process.env.HEYGEN_VOICE_ID
)
.then(path => console.log('✅ Video hazır:', path))
.catch(err => console.error('❌ Hata:', err));