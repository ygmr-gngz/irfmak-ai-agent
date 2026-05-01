require('dotenv').config();

const { generateHeygenVideo } = require('./generate-heygen-video');

(async () => {
  const script = `
İrfmak olarak üretimin her aşamasında kaliteye önem veriyoruz.
Tasarım sürecinden kumaş seçimine kadar her detay dikkatle planlanır.
Dikiş makinelerimizde hazırlanan ürünler, titiz bir kontrolden geçirilir.
Amacımız, müşterilerimize dayanıklı, şık ve güvenilir çözümler sunmaktır.
İrfmak ile üretimde kaliteyi, güveni ve profesyonelliği bir arada yaşayın.
`;

  const avatarId = process.env.AVATAR_ID || process.env.HEYGEN_AVATAR_ID;
  const voiceId = process.env.VOICE_ID || process.env.HEYGEN_VOICE_ID;

  const videoPath = await generateHeygenVideo(script, avatarId, voiceId);

  console.log('✅ Video hazır:', videoPath);
})();