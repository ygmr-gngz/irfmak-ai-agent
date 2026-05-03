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
    exec(command, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
      if (error) { console.error(stderr); reject(error); }
      else { resolve(stdout); }
    });
  });
}
 
function ensureTmp() {
  if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');
}
 
function checkFiles() {
  for (const file of BROLL_VIDEOS) {
    if (!fs.existsSync(file)) {
      throw new Error(`${file} bulunamadı.`);
    }
  }
  if (!AVATAR_ID) throw new Error('AVATAR_ID .env içinde yok.');
  if (!VOICE_ID) throw new Error('VOICE_ID .env içinde yok.');
}
 
function cleanText(text) {
  return String(text || '')
    .replace(/[\n\r]/g, ' ')
    .replace(/"/g, "'")
    .replace(/[^\w\s\u00C0-\u024F.,!?'&()-]/g, '')
    .trim();
}
 
function getBrollPath(source) {
  const shuffled = [...BROLL_VIDEOS].sort(() => Math.random() - 0.5);
  if (source === 'bg2') return shuffled[1] || BROLL_VIDEOS[1];
  if (source === 'bg3') return shuffled[2] || BROLL_VIDEOS[2];
  return shuffled[0] || BROLL_VIDEOS[0];
}
 
async function generateScenePlan(topic) {
  console.log('🧠 AI sahne planı oluşturuyor...');
 
  const prompt = `
Sen profesyonel bir Instagram Reels editörüsün. İrfmak Makina markası için video yapıyorsun.
 
Konu: ${topic}
 
9:16 formatında, 45-60 saniye uzunluğunda bir sahne planı üret.
 
ZORUNLU KURALLAR:
- Toplam 7 sahne olsun
- Sıra MUTLAKA şöyle: broll → broll → avatar → broll → broll → avatar → logo
- Avatar sahnesi sadece 2 kez çıksın
- B-roll sahneler 7-8 saniye
- Avatar metinleri kısa ve enerjik (max 2 cümle, toplam 15 kelime)
- Son sahne logo olsun
- source değerleri: bg1, bg2, bg3 (hepsini kullan)
- Sadece JSON döndür, başka hiçbir şey yazma
 
JSON:
[
  { "type": "broll", "duration": 8, "source": "bg1", "caption": "Kısa başlık" },
  { "type": "broll", "duration": 8, "source": "bg2", "caption": "Kısa başlık" },
  { "type": "avatar", "text": "Kısa cümle. Bir cümle daha." },
  { "type": "broll", "duration": 8, "source": "bg3", "caption": "Kısa başlık" },
  { "type": "broll", "duration": 8, "source": "bg1", "caption": "Kısa başlık" },
  { "type": "avatar", "text": "Kapanış cümlesi. Harekete geçir." },
  { "type": "logo", "duration": 4 }
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
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
 
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI sahne planı üretmedi.');
 
  const jsonText = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  const plan = JSON.parse(jsonText);
 
  console.log('✅ Sahne planı:');
  plan.forEach((s, i) => {
    if (s.type === 'broll') console.log(`  ${i+1}. B-ROLL (${s.duration}sn) - ${s.caption}`);
    if (s.type === 'avatar') console.log(`  ${i+1}. AVATAR - "${s.text?.substring(0, 50)}"`);
    if (s.type === 'logo') console.log(`  ${i+1}. LOGO (${s.duration}sn)`);
  });
 
  return plan;
}
 
// Dikiş ortam sesi - sadece pink noise (sine olmadan)
async function createSewingSound(outputPath, duration) {
  const command = `ffmpeg -y -f lavfi -i "anoisesrc=color=pink:amplitude=0.025:duration=${duration}" -af "volume=0.3" -t ${duration} -c:a aac -ar 44100 -ac 2 "${outputPath}"`;
  await runCommand(command);
}
 
// Avatar sesini çıkar
async function extractAudio(videoPath, audioPath) {
  const command = `ffmpeg -y -i "${videoPath}" -vn -c:a aac -ar 44100 -ac 2 "${audioPath}"`;
  await runCommand(command);
}
 
// B-roll sahne - dikiş sesi ile
async function makeBrollScene(inputPath, outputPath, duration, caption, ambientSoundPath) {
  const safeCaption = cleanText(caption);
 
  const filter = safeCaption
    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,drawtext=text='${safeCaption}':x=(w-text_w)/2:y=h-180:fontsize=52:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=22`
    : `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;
 
  const command = `ffmpeg -y -stream_loop -1 -i "${inputPath}" -i "${ambientSoundPath}" -t ${duration} -vf "${filter}" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -c:a aac -shortest "${outputPath}"`;
  await runCommand(command);
}
 
// Avatar sahne
async function makeAvatarScene(inputPath, outputPath) {
  const command = `ffmpeg -y -i "${inputPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -c:a aac -ar 44100 -ac 2 "${outputPath}"`;
  await runCommand(command);
}
 
// Logo sahnesi
async function makeLogoScene(outputPath, duration, ambientSoundPath) {
  const command = `ffmpeg -y -f lavfi -i "color=c=0x8B0000:size=1080x1920:rate=30" -i "${ambientSoundPath}" -t ${duration} -vf "drawtext=text='İrfmak Makina':x=(w-text_w)/2:y=(h-text_h)/2-80:fontsize=90:fontcolor=white,drawtext=text='Singer & Pfaff':x=(w-text_w)/2:y=(h-text_h)/2+40:fontsize=55:fontcolor=#ffcccc,drawtext=text='irfmak.com':x=(w-text_w)/2:y=(h-text_h)/2+130:fontsize=42:fontcolor=#dddddd" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -c:a aac -shortest "${outputPath}"`;
  await runCommand(command);
}
 
// Sahneleri birleştir
async function concatScenes(scenePaths, outputPath) {
  const listPath = './tmp/reels_concat_list.txt';
  const content = scenePaths
    .map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`)
    .join('\n');
  fs.writeFileSync(listPath, content);
 
  const command = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
  await runCommand(command);
}
 
// Avatar seslerini birleştir ve video üzerine ekle
async function mixNarrationOverVideo(videoPath, audioPaths, outputPath) {
  // Avatar seslerini birleştir
  const concatAudioList = './tmp/audio_list.txt';
  fs.writeFileSync(concatAudioList, audioPaths.map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));
 
  const concatAudioPath = './tmp/narration_full.aac';
  await runCommand(`ffmpeg -y -f concat -safe 0 -i "${concatAudioList}" -c copy "${concatAudioPath}"`);
 
  // Narrasyon sesini video üzerine ekle, arka plan sesini düşür
  const command = `ffmpeg -y -i "${videoPath}" -i "${concatAudioPath}" -filter_complex "[0:a]volume=0.2[bg];[1:a]volume=1.0[narration];[bg][narration]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -shortest "${outputPath}"`;
  await runCommand(command);
}
 
async function getRandomTopic() {
  console.log('💡 OpenAI konu üretiyor...');
 
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `İrfmak Makina, Singer ve Pfaff dikiş makineleri satan bir markadır.
Bu marka için Instagram Reels videosu yapılacak.
Aşağıdaki konulardan BİRİNİ rastgele seç ve sadece o konuyu yaz (1-2 cümle):
 
- Singer dikiş makinelerinin avantajları
- Pfaff makinelerinin farkı nedir
- Ev dikiş makinesinde nelere dikkat edilmeli
- Profesyonel dikiş makinesi nasıl seçilir
- Dikiş makinesinin bakımı nasıl yapılır
- İrfmak Makina'nın müşteriye farkı
- Hangi makine hangi kumaş için uygundur
- Yeni başlayanlar için dikiş makinesi tavsiyeleri
- Dikiş makinesinde iş yeri verimliliği
- İplik ve iğne seçiminin önemi
 
Sadece seçtiğin konuyu yaz, başka hiçbir şey yazma.`
      }],
      temperature: 1.0
    })
  });
 
  const data = await res.json();
  const topic = data.choices?.[0]?.message?.content?.trim();
  console.log('📌 Seçilen konu:', topic);
  return topic;
}
 
async function generateReelsVideo(topic) {
  ensureTmp();
  checkFiles();
 
  console.log('🎬 Profesyonel Reels üretimi başlıyor...');
  console.log('📌 Konu:', topic);
 
  const plan = await generateScenePlan(topic);
 
  // Dikiş ortam sesi oluştur
  console.log('\n🔊 Dikiş ortam sesi oluşturuluyor...');
  const sewingSoundPath = './tmp/sewing_ambient.aac';
  await createSewingSound(sewingSoundPath, 120);
 
  const finalScenePaths = [];
  const avatarAudioPaths = [];
 
  for (let i = 0; i < plan.length; i++) {
    const scene = plan[i];
    const sceneNumber = String(i + 1).padStart(2, '0');
 
    if (scene.type === 'broll') {
      console.log(`\n🎥 B-roll sahne ${sceneNumber} (${scene.duration}sn) - ${scene.caption}`);
      const inputPath = getBrollPath(scene.source);
      const outputPath = `./tmp/reels_scene_${sceneNumber}_broll.mp4`;
      await makeBrollScene(inputPath, outputPath, scene.duration || 8, scene.caption || '', sewingSoundPath);
      finalScenePaths.push(outputPath);
    }
 
    if (scene.type === 'avatar') {
      console.log(`\n🧍 Avatar sahne ${sceneNumber}...`);
      const avatarRawPath = await generateHeygenVideo(scene.text, AVATAR_ID, VOICE_ID);
 
      // Avatar sesini çıkar
      const avatarAudioPath = `./tmp/avatar_audio_${sceneNumber}.aac`;
      await extractAudio(avatarRawPath, avatarAudioPath);
      avatarAudioPaths.push(avatarAudioPath);
 
      const outputPath = `./tmp/reels_scene_${sceneNumber}_avatar.mp4`;
      await makeAvatarScene(avatarRawPath, outputPath);
      finalScenePaths.push(outputPath);
    }
 
    if (scene.type === 'logo') {
      console.log(`\n🏁 Logo kapanış sahnesi...`);
      const outputPath = `./tmp/reels_scene_${sceneNumber}_logo.mp4`;
      await makeLogoScene(outputPath, scene.duration || 4, sewingSoundPath);
      finalScenePaths.push(outputPath);
    }
  }
 
  // Ham videoyu birleştir
  const rawOutput = `./tmp/raw_reels_${Date.now()}.mp4`;
  console.log('\n🧩 Sahneler birleştiriliyor...');
  await concatScenes(finalScenePaths, rawOutput);
 
  // Narrasyon sesini tüm video üzerine ekle
  const finalOutput = `./tmp/final_reels_${Date.now()}.mp4`;
  console.log('🎙️ Narrasyon sesi ekleniyor...');
  await mixNarrationOverVideo(rawOutput, avatarAudioPaths, finalOutput);
 
  console.log('\n🎉 FINAL REELS HAZIR:', finalOutput);
  return finalOutput;
}
 
(async () => {
  // Komut satırından konu verilmişse onu kullan, yoksa OpenAI üretsin
  const topic = process.argv[2] || await getRandomTopic();
  await generateReelsVideo(topic);
})();
 