require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { generateHeygenAgentVideo } = require('./generate-heygen-agent-video');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function cleanText(text) {
  return String(text || '')
    .replace(/[\n\r]/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPromptOutput(text) {
  return cleanText(text)
    .replace(/^\*\*Prompt:\*\*/i, '')
    .replace(/^Prompt:/i, '')
    .replace(/^HeyGen Prompt:/i, '')
    .replace(/\*\*/g, '')        // bold kaldır
    .replace(/#{1,6}\s?/g, '')   // heading kaldır
    .replace(/`/g, '')           // code kaldır
    .replace(/\d+\.\s/g, '')     // 1. 2. 3. kaldır
    .trim();
}

async function generateHeygenPrompt(topic) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY .env içinde yok.');
  }

  const openaiPrompt = `
Sen profesyonel bir reklam filmi yönetmeni ve HeyGen Video Agent prompt mühendisinden oluşan bir ekipsin.

Marka:
İrfmak Makina. Singer ve Pfaff dikiş makineleri satar. Makine seçimi, teknik servis, yedek parça ve danışmanlık desteği verir.

Konu:
${topic}

Görev:
HeyGen Video Agent'a verilecek tek ve güçlü bir video üretim promptu yaz.

ÇOK ÖNEMLİ:
- Sadece HeyGen'e verilecek promptu yaz.
- JSON yazma.
- Markdown yazma.
- Başına 'Prompt:' yazma.
- Açıklama yazma.
- Direkt video üretim talimatı yaz.
Hook, subtitle and sales system (STRICT RULES):

- The first 2 seconds MUST include a strong hook.
- The hook should be visually and audibly impactful.
- Use a close-up shot with motion in the first second.
- The video MUST start with a powerful or curiosity-driven sentence.
- Voiceover MUST start immediately.

Subtitles:
- Turkish subtitles MUST be visible during the entire video.
- Subtitles MUST match the voiceover exactly.
- Subtitles MUST be clean, modern, centered and inside the safe area.
- Use short subtitle lines, not long sentences.
- Highlight important words with slightly larger or emphasized text.
- Use subtle fade or scale animation.

Sales feeling:
- The video MUST feel like a premium commercial, not an explanation.
- Build trust and authority.
- Emphasize that choosing the right machine directly affects quality.
- Position İrfmak Makina as a trusted expert.
- Avoid exaggerated sales tone.

Ending:
- End with a soft but clear call to action:
  “Doğru makine için İrfmak Makina.”

On-screen text rules:
- Text must be very short: maximum 1-3 words per scene.
- Do not put long sentences on screen.
- Use clean large text but keep all text inside the safe area.
- Do not crop the first letter of any word.
- Keep Turkish characters readable.
- Apply a subtle zoom-in / scale-up text animation effect when text appears.
- Text should feel modern and premium, not too wide, not too large.
- Use short Turkish text overlays such as: 'Pfaff', 'Hassasiyet', 'Güçlü Dikiş', 'Doğru Seçim', 'İrfmak Makina'.
- If 'Hassasiyet' is used, make sure the full word is visible and the first letter H is not cut off.

Brand tone:
Premium, trustworthy, clean, professional, not exaggerated.

Outro:
End with a very short clean brand outro including: 'İrfmak Makina', 'Singer & Pfaff', 'irfmak.com'.
The outro must last only 1.5 seconds.
Do not make the logo ending long.
Do not leave 2-3 seconds of empty logo screen.

Suggested Turkish voiceover:
'Pfaff dikiş makineleri, hassasiyet ve güçlü dikiş isteyenler için öne çıkar. Doğru makine seçimi, işinizin kalitesini doğrudan etkiler. İrfmak Makina, Singer ve Pfaff modellerinde doğru seçimi yapmanız için yanınızda. Satıştan servise kadar güvenilir destek sunar.'

Video structure:
1. First second: voiceover starts immediately with sewing machine or fabric close-up.
2. Show Pfaff/Singer-style sewing machine details.
3. Show stitching, needle movement and fabric close-ups.
4. Show workshop or textile production atmosphere.
5. Mention İrfmak Makina as trusted advisor for the right machine choice and service support.
6. End with very short brand outro.

Write the final HeyGen prompt as one polished production brief.
`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: openaiPrompt }],
      temperature: 0.65
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('OpenAI hata: ' + err);
  }

  const data = await res.json();
  return cleanPromptOutput(data.choices?.[0]?.message?.content);
}

async function main() {
  const topic = process.argv.slice(2).join(' ') || 'Pfaff makineleri neden daha iyi?';

  if (!fs.existsSync('./outputs')) {
    fs.mkdirSync('./outputs', { recursive: true });
  }

  console.log('🧠 OpenAI HeyGen Agent promptu hazırlıyor...');
  const heygenPrompt = await generateHeygenPrompt(topic);

  const promptPath = path.join('./outputs', `heygen_prompt_${Date.now()}.txt`);
  fs.writeFileSync(promptPath, heygenPrompt);

  console.log('\n✅ HeyGen prompt hazır:');
  console.log(heygenPrompt);
  console.log('\n📝 Prompt kaydedildi:', promptPath);

  const videoPath = await generateHeygenAgentVideo(heygenPrompt);

  console.log('\n🎉 FINAL HEYGEN AGENT VIDEO:');
  console.log(videoPath);
}

main().catch(error => {
  console.error('\n❌ Hata:', error.message);
  process.exit(1);
});