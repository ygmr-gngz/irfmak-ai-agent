require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const { generateHeygenVideo } = require('./generate-heygen-video');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const AVATAR_ID = process.env.AVATAR_ID || process.env.HEYGEN_AVATAR_ID;
const VOICE_ID = process.env.VOICE_ID || process.env.HEYGEN_VOICE_ID;

const BROLL_VIDEOS = [
  './tmp/bg1.mp4',
  './tmp/bg2.mp4',
  './tmp/bg3.mp4'
];

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
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

function checkFiles() {
  for (const file of BROLL_VIDEOS) {
    if (!fs.existsSync(file)) {
      throw new Error(`${file} bulunamadı. tmp klasörüne bg1.mp4, bg2.mp4, bg3.mp4 koy.`);
    }
  }

  if (!AVATAR_ID) throw new Error('AVATAR_ID .env içinde yok.');
  if (!VOICE_ID) throw new Error('VOICE_ID .env içinde yok.');
}

function cleanText(text) {
  return String(text || '')
    .replace(/[\n\r]/g, ' ')
    .replace(/"/g, "'")
    .trim();
}

async function generateScenePlan(topic) {
  if (!OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY yok, hazır reels planı kullanılıyor.');

    return [
      {
        type: 'broll',
        duration: 8,
        source: 'bg1',
        caption: 'Üretimde kalite'
      },
      {
        type: 'avatar',
        text: 'İrfmak olarak üretimin her aşamasında kaliteye önem veriyoruz.'
      },
      {
        type: 'broll',
        duration: 8,
        source: 'bg2',
        caption: 'Titiz işçilik'
      },
      {
        type: 'avatar',
        text: 'Tasarım sürecinden dikiş aşamasına kadar her detayı özenle hazırlıyoruz.'
      },
      {
        type: 'broll',
        duration: 4,
        source: 'bg3',
        caption: 'Güvenilir üretim'
      },
      {
        type: 'avatar',
        text: 'İrfmak ile profesyonel, dayanıklı ve şık çözümler sunuyoruz.'
      }
    ];
  }

  console.log('🧠 AI sahne planı oluşturuyor...');

  const prompt = `
Sen profesyonel bir kısa video / reels editörüsün.

Konu:
${topic}

Bana 9:16 Instagram Reels / YouTube Shorts formatında bir sahne planı üret.

Kurallar:
- Toplam 20-35 saniye olsun.
- Avatar sahneleri kısa olsun.
- B-roll sahneleri üretim, dikiş makinesi, kumaş, çizim, atölye gibi görüntüler olsun.
- Sahne sırası dinamik olsun: broll, avatar, broll, avatar, broll, avatar.
- Sadece JSON döndür.
- Açıklama yazma.

JSON formatı:
[
  {
    "type": "broll",
    "duration": 3,
    "source": "bg1",
    "caption": "Kısa başlık"
  },
  {
    "type": "avatar",
    "text": "Avatarın söyleyeceği kısa cümle"
  }
]
`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8
    })
  });

  const data = await res.json();

  const raw = data.choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error('OpenAI sahne planı üretmedi: ' + JSON.stringify(data));
  }

  const jsonText = raw
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const plan = JSON.parse(jsonText);

  console.log('✅ AI sahne planı hazır:');
  console.log(JSON.stringify(plan, null, 2));

  return plan;
}

function getBrollPath(source) {
  if (source === 'bg2') return BROLL_VIDEOS[1];
  if (source === 'bg3') return BROLL_VIDEOS[2];
  return BROLL_VIDEOS[0];
}

async function makeBrollScene(inputPath, outputPath, duration, caption) {
  const safeCaption = cleanText(caption);

  const filter = safeCaption
    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,drawtext=text='${safeCaption}':x=(w-text_w)/2:y=h-260:fontsize=54:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=24`
    : `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;

  const command = `ffmpeg -y -stream_loop -1 -i "${inputPath}" -f lavfi -t ${duration} -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${duration} -vf "${filter}" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -c:a aac -shortest "${outputPath}"`;

  await runCommand(command);
}

async function makeAvatarScene(inputPath, outputPath) {
  const command = `ffmpeg -y -i "${inputPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -c:a aac -ar 44100 -ac 2 "${outputPath}"`;

  await runCommand(command);
}

async function concatScenes(scenePaths, outputPath) {
  const listPath = './tmp/reels_concat_list.txt';

  const content = scenePaths
    .map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`)
    .join('\n');

  fs.writeFileSync(listPath, content);

  const command = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;

  await runCommand(command);
}

async function generateReelsVideo(topic) {
  ensureTmp();
  checkFiles();

  console.log('🎬 Tam otomatik reels üretimi başlıyor...');

  const plan = await generateScenePlan(topic);

  const finalScenePaths = [];

  for (let i = 0; i < plan.length; i++) {
    const scene = plan[i];
    const sceneNumber = String(i + 1).padStart(2, '0');

    if (scene.type === 'broll') {
      console.log(`🎥 B-roll sahne hazırlanıyor: ${sceneNumber}`);

      const inputPath = getBrollPath(scene.source);
      const outputPath = `./tmp/reels_scene_${sceneNumber}_broll.mp4`;

      await makeBrollScene(
        inputPath,
        outputPath,
        scene.duration || 3,
        scene.caption || ''
      );

      finalScenePaths.push(outputPath);
    }

    if (scene.type === 'avatar') {
      console.log(`🧍 Avatar sahne hazırlanıyor: ${sceneNumber}`);

      const avatarRawPath = await generateHeygenVideo(
        scene.text,
        AVATAR_ID,
        VOICE_ID
      );

      const outputPath = `./tmp/reels_scene_${sceneNumber}_avatar.mp4`;

      await makeAvatarScene(avatarRawPath, outputPath);

      finalScenePaths.push(outputPath);
    }
  }

  const finalOutput = `./tmp/final_reels_${Date.now()}.mp4`;

  console.log('🧩 Sahne sahne video birleştiriliyor...');
  await concatScenes(finalScenePaths, finalOutput);

  console.log('✅ FINAL REELS HAZIR:', finalOutput);

  return finalOutput;
}

(async () => {
  const topic = `
İrfmak için profesyonel bir tanıtım videosu.
Üretim kalitesi, dikiş makineleri, tasarım süreci, kumaş işçiliği ve güvenilir hizmet vurgulansın.
Video Instagram Reels ve YouTube Shorts formatında olsun.
`;

  await generateReelsVideo(topic);
})();