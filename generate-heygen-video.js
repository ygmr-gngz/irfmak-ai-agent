require('dotenv').config();
const fs = require('fs');
const path = require('path');

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

const AVATAR_BACKGROUNDS = [
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
  'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg'
];

async function readJsonResponse(res, label) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    console.log(`${label} HTTP STATUS:`, res.status);
    console.log(`${label} RAW RESPONSE:`, text.slice(0, 1500));
    throw new Error(`${label}: JSON cevap alınamadı.`);
  }
}

async function generateHeygenVideo(script, avatarId, voiceId, options = {}) {
  console.log('🎙️ HeyGen avatar sahnesi oluşturuluyor...');

  if (!HEYGEN_API_KEY) throw new Error('HEYGEN_API_KEY .env içinde yok.');
  if (!avatarId) throw new Error('AVATAR_ID boş geldi.');
  if (!voiceId) throw new Error('VOICE_ID boş geldi.');

  const backgroundUrl =
    options.backgroundUrl ||
    AVATAR_BACKGROUNDS[Math.floor(Math.random() * AVATAR_BACKGROUNDS.length)];

  const cleanScript = script.trim();

  const videoInputs = [
    {
      character: {
        type: 'avatar',
        avatar_id: avatarId,
        avatar_style: 'normal'
      },
      voice: {
        type: 'text',
        input_text: cleanScript,
        voice_id: voiceId,
        speed: options.speed || 1.0
      },
      background: {
        type: 'color',
        value: '#f5f5f5'
      }
    }
  ];

  console.log('Avatar ID:', avatarId);
  console.log('Voice ID:', voiceId);
  console.log('Metin:', cleanScript);

  const createRes = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': HEYGEN_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      video_inputs: videoInputs,
      dimension: {
        width: 1080,
        height: 1920
      },
      aspect_ratio: '9:16'
    })
  });

  const createData = await readJsonResponse(createRes, 'CREATE');
  console.log('Create response:', JSON.stringify(createData, null, 2));

  if (!createData.data?.video_id) {
    throw new Error('Video ID alınamadı: ' + JSON.stringify(createData));
  }

  const videoId = createData.data.video_id;
  console.log('📹 Video ID:', videoId);

  let videoUrl = null;

  for (let i = 0; i < 90; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000));

    const statusRes = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY
        }
      }
    );

    const statusData = await readJsonResponse(statusRes, 'STATUS');
    const status = statusData.data?.status;

    console.log(`Durum (${i + 1}/90):`, status);

    if (status === 'completed') {
      videoUrl = statusData.data.video_url;
      break;
    }

    if (status === 'failed') {
      throw new Error('HeyGen failed: ' + JSON.stringify(statusData.data));
    }
  }

  if (!videoUrl) {
    throw new Error('Video zaman aşımına uğradı.');
  }

  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const outputPath = path.join(tmpDir, `avatar_scene_${Date.now()}.mp4`);

  const videoRes = await fetch(videoUrl);

  if (!videoRes.ok) {
    const errText = await videoRes.text();
    console.log('DOWNLOAD STATUS:', videoRes.status);
    console.log('DOWNLOAD RESPONSE:', errText.slice(0, 1000));
    throw new Error('HeyGen videosu indirilemedi.');
  }

  const buffer = await videoRes.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  console.log('✅ Avatar sahnesi indirildi:', outputPath);

  return outputPath;
}

module.exports = { generateHeygenVideo };