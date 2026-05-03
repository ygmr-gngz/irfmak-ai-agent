require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { generateHeygenVideo } = require('./generate-heygen-video');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AVATAR_ID = process.env.AVATAR_ID || process.env.HEYGEN_AVATAR_ID;
const VOICE_ID = process.env.VOICE_ID || process.env.HEYGEN_VOICE_ID;

const TMP_DIR = './tmp';
const OUTPUT_DIR = './outputs';

const VIDEO_MODE = process.env.VIDEO_MODE || 'short';
const HEYGEN_TRIM_START = Number(process.env.HEYGEN_TRIM_START || 0.8);

const BROLL_VIDEOS = {
  bg1: './tmp/bg1.mp4',
  bg2: './tmp/bg2.mp4',
  bg3: './tmp/bg3.mp4'
};

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 300 }, (error, stdout, stderr) => {
      if (error) {
        console.error('\nFFMPEG ERROR:\n', stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

function ensureDirs() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function checkEnvAndFiles() {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY .env içinde yok.');
  if (!AVATAR_ID) throw new Error('AVATAR_ID / HEYGEN_AVATAR_ID .env içinde yok.');
  if (!VOICE_ID) throw new Error('VOICE_ID / HEYGEN_VOICE_ID .env içinde yok.');

  for (const [key, file] of Object.entries(BROLL_VIDEOS)) {
    if (!fs.existsSync(file)) {
      throw new Error(`${key} bulunamadı: ${file}`);
    }
  }
}

function cleanTmpGeneratedFiles() {
  const keep = new Set(['bg1.mp4', 'bg2.mp4', 'bg3.mp4']);

  for (const file of fs.readdirSync(TMP_DIR)) {
    if (keep.has(file)) continue;
    fs.rmSync(path.join(TMP_DIR, file), { recursive: true, force: true });
  }
}

function cleanText(text) {
  return String(text || '')
    .replace(/[\n\r]/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeDrawText(text) {
  return cleanText(text)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

function extractJson(raw) {
  const clean = String(raw || '')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');

  if (first === -1 || last === -1) {
    throw new Error('OpenAI JSON döndürmedi: ' + clean);
  }

  return JSON.parse(clean.slice(first, last + 1));
}

function getBrollPath(source) {
  return BROLL_VIDEOS[source] || BROLL_VIDEOS.bg1;
}

async function generateVideoPlan(topic) {
  const prompt = `
Sen profesyonel bir reklam filmi yönetmeni ve kısa video senaristisin.

Marka:
İrfmak Makina. Singer ve Pfaff dikiş makineleri satışı, servis, yedek parça ve doğru makine danışmanlığı.

Konu:
${topic}

Yeni video tarzı:
- Videoda avatar görünmeyecek.
- HeyGen sadece ses/anlatım üretmek için kullanılacak.
- Görüntü tamamen sinematik b-roll videolardan oluşacak.
- Yazılar kısa, temiz ve reklam filmi gibi olacak.
- Video kolaj gibi değil, tek bir reklam hikayesi gibi akacak.
- Metinler geniş ve uzun olmayacak.
- Her caption maksimum 4 kelime olacak.
- Voiceover profesyonel reklam anlatımı gibi olacak.

Zorunlu sahne sırası:
1. hook b-roll
2. b-roll + voiceover
3. b-roll
4. b-roll + voiceover
5. b-roll
6. logo

B-roll source değerleri sadece bg1, bg2, bg3 olabilir.

Sadece JSON döndür. Markdown yazma.

JSON:
{
  "title": "Video başlığı",
  "youtubeTitle": "YouTube başlığı",
  "youtubeDescription": "YouTube açıklaması",
  "instagramCaption": "Instagram açıklaması",
  "hashtags": ["#Singer", "#Pfaff", "#DikisMakinesi"],
  "voiceoverFull": "Tüm videonun profesyonel anlatım metni. Kısa, akıcı ve reklam tonu taşıyan 4-5 cümle.",
  "scenes": [
    {
      "type": "broll",
      "source": "bg1",
      "duration": 4,
      "caption": "Bir hikaye başlar"
    },
    {
      "type": "voice_broll",
      "source": "bg2",
      "duration": 7,
      "caption": "Doğru makine",
      "voice": "Doğru dikiş makinesi, işinize kalite ve güven katar."
    },
    {
      "type": "broll",
      "source": "bg3",
      "duration": 4,
      "caption": "Hassas işçilik"
    },
    {
      "type": "voice_broll",
      "source": "bg1",
      "duration": 7,
      "caption": "Güvenli seçim",
      "voice": "İrfmak Makina, Singer ve Pfaff modellerinde doğru seçimi yapmanız için yanınızda."
    },
    {
      "type": "broll",
      "source": "bg2",
      "duration": 4,
      "caption": "Güçlü sonuç"
    },
    {
      "type": "logo",
      "duration": 2
    }
  ]
}
`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('OpenAI hata: ' + err);
  }

  const data = await res.json();
  const plan = extractJson(data.choices?.[0]?.message?.content);

  if (!Array.isArray(plan.scenes)) {
    throw new Error('Plan içinde scenes yok.');
  }

  return plan;
}

async function extractAudioFromHeygenVideo(videoPath, audioPath) {
  const command = `ffmpeg -y -ss ${HEYGEN_TRIM_START} -i "${videoPath}" -vn -c:a aac -ar 44100 -ac 2 "${audioPath}"`;
  await runCommand(command);
}

async function makeBrollScene(scene, outputPath) {
  const inputPath = getBrollPath(scene.source);
  const duration = Number(scene.duration || 4);
  const caption = escapeDrawText(scene.caption || '');

  const command = `ffmpeg -y -stream_loop -1 -i "${inputPath}" -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t ${duration} -vf "scale=1160:2062,crop=1080:1920:x='(iw-ow)/2':y='(ih-oh)/2',eq=contrast=1.05:saturation=1.08,drawtext=text='${caption}':x=(w-text_w)/2:y=h-310:fontsize=44:fontcolor=white:box=1:boxcolor=black@0.48:boxborderw=18,drawtext=text='İrfmak Makina':x=(w-text_w)/2:y=h-105:fontsize=30:fontcolor=white@0.80" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 21 -c:a aac -ar 44100 -ac 2 -shortest "${outputPath}"`;

  await runCommand(command);
}

async function makeVoiceBrollScene(scene, outputPath) {
  const inputPath = getBrollPath(scene.source);
  const duration = Number(scene.duration || 7);
  const caption = escapeDrawText(scene.caption || '');
  const voiceText = cleanText(scene.voice || '');

  console.log(`🎙️ Voiceover üretiliyor: ${voiceText}`);

  const rawAvatarVideo = await generateHeygenVideo(voiceText, AVATAR_ID, VOICE_ID, {
    speed: 1.03
  });

  const audioPath = path.join(TMP_DIR, `voice_${Date.now()}.aac`);
  await extractAudioFromHeygenVideo(rawAvatarVideo, audioPath);

  const command = `ffmpeg -y -stream_loop -1 -i "${inputPath}" -i "${audioPath}" -t ${duration} -vf "scale=1160:2062,crop=1080:1920:x='(iw-ow)/2':y='(ih-oh)/2',eq=contrast=1.06:saturation=1.1,drawtext=text='${caption}':x=(w-text_w)/2:y=h-310:fontsize=44:fontcolor=white:box=1:boxcolor=black@0.50:boxborderw=18,drawtext=text='İrfmak Makina':x=(w-text_w)/2:y=h-105:fontsize=30:fontcolor=white@0.80" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 21 -c:a aac -ar 44100 -ac 2 -shortest "${outputPath}"`;

  await runCommand(command);
}

async function makeLogoScene(outputPath, duration = 2) {
  const command = `ffmpeg -y -f lavfi -i "color=c=0x8B0000:size=1080x1920:rate=30" -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t ${duration} -vf "drawtext=text='İrfmak Makina':x=(w-text_w)/2:y=(h-text_h)/2-95:fontsize=82:fontcolor=white,drawtext=text='Singer & Pfaff':x=(w-text_w)/2:y=(h-text_h)/2+25:fontsize=50:fontcolor=#ffcccc,drawtext=text='irfmak.com':x=(w-text_w)/2:y=(h-text_h)/2+115:fontsize=36:fontcolor=#eeeeee" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 21 -c:a aac -ar 44100 -ac 2 -shortest "${outputPath}"`;

  await runCommand(command);
}

async function concatScenes(scenePaths, outputPath) {
  const listPath = path.join(TMP_DIR, 'concat_list.txt');

  fs.writeFileSync(
    listPath,
    scenePaths
      .map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`)
      .join('\n')
  );

  const command = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 21 -c:a aac -ar 44100 -ac 2 "${outputPath}"`;

  await runCommand(command);
}

function writeMetadata(plan, videoPath) {
  const metadataPath = videoPath.replace('.mp4', '.json');

  fs.writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        video: videoPath,
        mode: VIDEO_MODE,
        title: plan.title,
        youtubeTitle: plan.youtubeTitle,
        youtubeDescription: plan.youtubeDescription,
        instagramCaption: plan.instagramCaption,
        hashtags: plan.hashtags,
        scenes: plan.scenes,
        createdAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  return metadataPath;
}

async function generateReelsVideo(topic) {
  ensureDirs();
  checkEnvAndFiles();
  cleanTmpGeneratedFiles();

  console.log('🎬 Avatar görselsiz reklam videosu oluşturuluyor...');
  console.log('📌 Konu:', topic);

  const plan = await generateVideoPlan(topic);

  console.log('\n✅ Plan oluşturuldu:');
  plan.scenes.forEach((s, i) => {
    console.log(`${i + 1}. ${s.type.toUpperCase()} - ${s.caption || s.voice || ''}`);
  });

  const outputs = [];

  for (let i = 0; i < plan.scenes.length; i++) {
    const scene = plan.scenes[i];
    const outputPath = path.join(TMP_DIR, `scene_${String(i + 1).padStart(2, '0')}.mp4`);

    if (scene.type === 'broll') {
      console.log(`\n🎥 B-roll: ${scene.caption}`);
      await makeBrollScene(scene, outputPath);
    }

    if (scene.type === 'voice_broll') {
      console.log(`\n🎥🎙️ Voice B-roll: ${scene.caption}`);
      await makeVoiceBrollScene(scene, outputPath);
    }

    if (scene.type === 'logo') {
      console.log('\n🏁 Logo sahnesi');
      await makeLogoScene(outputPath, scene.duration || 2);
    }

    outputs.push(outputPath);
  }

  const finalPath = path.join(OUTPUT_DIR, `irfmak_${VIDEO_MODE}_${Date.now()}.mp4`);

  console.log('\n🧩 Sahneler birleştiriliyor...');
  await concatScenes(outputs, finalPath);

  const metadataPath = writeMetadata(plan, finalPath);

  console.log('\n✅ FINAL VIDEO HAZIR:');
  console.log(finalPath);
  console.log('📝 Metadata:', metadataPath);

  return finalPath;
}

(async () => {
  try {
    const topic = process.argv.slice(2).join(' ') || 'Bir elbisenin hikayesi doğru makineyle başlar';
    await generateReelsVideo(topic);
  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    process.exit(1);
  }
})();
