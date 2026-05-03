require('dotenv').config();

const fs = require('fs');
const path = require('path');

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

async function readJsonResponse(res, label) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    console.log(`${label} HTTP STATUS:`, res.status);
    console.log(`${label} RAW RESPONSE:`, text.slice(0, 2000));
    throw new Error(`${label}: JSON cevap alınamadı.`);
  }
}

async function downloadVideo(videoUrl, outputPath) {
  const res = await fetch(videoUrl);

  if (!res.ok) {
    const errText = await res.text();
    console.log('DOWNLOAD STATUS:', res.status);
    console.log('DOWNLOAD RESPONSE:', errText.slice(0, 1000));
    throw new Error('HeyGen videosu indirilemedi.');
  }

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

async function generateHeygenAgentVideo(prompt) {
  if (!HEYGEN_API_KEY) {
    throw new Error('HEYGEN_API_KEY .env içinde yok.');
  }

  const outputDir = './outputs';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎬 HeyGen Video Agent videosu oluşturuluyor...');
  console.log('Prompt:', prompt.slice(0, 1200));

  const createRes = await fetch('https://api.heygen.com/v1/video_agent/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': HEYGEN_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt
    })
  });

  const createData = await readJsonResponse(createRes, 'HEYGEN_AGENT_CREATE');
  console.log('Create response:', JSON.stringify(createData, null, 2));

  const videoId =
    createData.data?.video_id ||
    createData.data?.id ||
    createData.video_id ||
    createData.id;

  if (!videoId) {
    throw new Error('HeyGen Video Agent video_id alınamadı: ' + JSON.stringify(createData));
  }

  console.log('📹 Video Agent ID:', videoId);

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

    const statusData = await readJsonResponse(statusRes, 'HEYGEN_AGENT_STATUS');
    const status = statusData.data?.status || statusData.status;

    console.log(`Durum (${i + 1}/90):`, status);

    if (status === 'completed' || status === 'success') {
      videoUrl =
        statusData.data?.video_url ||
        statusData.data?.url ||
        statusData.data?.video_url_caption ||
        statusData.video_url ||
        statusData.url;
      break;
    }

    if (status === 'failed' || status === 'error') {
      throw new Error('HeyGen Video Agent failed: ' + JSON.stringify(statusData));
    }
  }

  if (!videoUrl) {
    throw new Error('HeyGen Video Agent video zaman aşımına uğradı.');
  }

  const outputPath = path.join(outputDir, `heygen_agent_video_${Date.now()}.mp4`);

  await downloadVideo(videoUrl, outputPath);

  console.log('✅ HeyGen Agent video indirildi:', outputPath);

  return outputPath;
}

module.exports = { generateHeygenAgentVideo };