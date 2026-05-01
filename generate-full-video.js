require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const { generateHeygenVideo } = require('./generate-heygen-video');

const BACKGROUND_VIDEOS = [
  './tmp/bg1.mp4',
  './tmp/bg2.mp4',
  './tmp/bg3.mp4'
];

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

function ensureTmp() {
  if (!fs.existsSync('./tmp')) {
    fs.mkdirSync('./tmp');
  }
}

async function cutVideo(input, output, duration = 4) {
  const command = `ffmpeg -y -i "${input}" -t ${duration} -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -an "${output}"`;
  await runCommand(command);
}

async function normalizeVideo(input, output) {
  const command = `ffmpeg -y -i "${input}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -an "${output}"`;
  await runCommand(command);
}

async function concatVideos(videoPaths, outputPath) {
  const listPath = './tmp/concat-list.txt';

  const listContent = videoPaths
    .map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`)
    .join('\n');

  fs.writeFileSync(listPath, listContent);

  const command = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
  await runCommand(command);
}

async function generateFullVideo(script, avatarId, voiceId) {
  ensureTmp();

  console.log('🎬 Reels tarzı video üretimi başlıyor...');

  // 1. Avatar konuşma videosu üret
  const avatarVideo = await generateHeygenVideo(script, avatarId, voiceId);
  console.log('🧍 Avatar sahnesi hazır:', avatarVideo);

  // 2. B-roll sahneleri hazırla
  const scene1 = './tmp/scene_1.mp4';
  const scene2 = './tmp/scene_2.mp4';
  const scene3 = './tmp/scene_3.mp4';
  const avatarScene = './tmp/avatar_scene.mp4';

  console.log('🎥 B-roll sahneleri hazırlanıyor...');

  await cutVideo(BACKGROUND_VIDEOS[0], scene1, 4);
  await cutVideo(BACKGROUND_VIDEOS[1], scene2, 4);
  await cutVideo(BACKGROUND_VIDEOS[2], scene3, 4);

  console.log('🧍 Avatar sahnesi normalize ediliyor...');
  await normalizeVideo(avatarVideo, avatarScene);

  // 3. Sırayla birleştir
  const outputPath = path.join('./tmp', `final_reels_${Date.now()}.mp4`);

  const sequence = [
    scene1,
    avatarScene,
    scene2,
    avatarScene,
    scene3
  ];

  console.log('🧩 Sahneler birleştiriliyor...');
  await concatVideos(sequence, outputPath);

  console.log('✅ FINAL REELS hazır:', outputPath);

  return outputPath;
}

// test
(async () => {
  const script = `
İrfmak olarak üretimin her aşamasında kaliteye önem veriyoruz.
Tasarım sürecinden kumaş seçimine kadar her detay dikkatle planlanır.
Dikiş makinelerimizde hazırlanan ürünler, titiz bir kontrolden geçirilir.
Amacımız, müşterilerimize dayanıklı, şık ve güvenilir çözümler sunmaktır.
`;

  const avatarId = process.env.AVATAR_ID || process.env.HEYGEN_AVATAR_ID;
  const voiceId = process.env.VOICE_ID || process.env.HEYGEN_VOICE_ID;

  await generateFullVideo(script, avatarId, voiceId);
})();