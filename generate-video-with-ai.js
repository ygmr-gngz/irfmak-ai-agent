require('dotenv').config();
const { generateHeygenVideo } = require('./generate-heygen-video');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateScript(topic) {
  console.log('ChatGPT senaryo yazıyor...');
  
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
            role: 'system',
            content: `Sen, İrfmak Makina markasının sosyal medya uzmanısın. Hedefin, Instagram Reels için 30-40 saniyelik, izleyiciyi ilk 3 saniyede yakalayan, enerjik ve satış odaklı Türkçe video konuşma metinleri yazmak.
          Yazdığın metinler:
         * Doğal, samimi ve akıcı bir konuşma diliyle olmalı (resmi değil, günlük dil).
         * İzleyiciyin dikkatini çekecek güçlü bir giriş cümlesiyle başlamalı.
         * Ürünün veya hizmetin faydasını net ve hızlı şekilde anlatmalı (özellik değil, fayda odaklı).
         * Kısa, ritmik ve akılda kalıcı cümlelerden oluşmalı.
         * Merak uyandıran veya problem çözen bir yapı içermeli.
         * İzleyiciyi aksiyona yönlendiren net bir kapanış içermeli.
          Ek kurallar:
         * Metin uzunluğu 30-40 saniyede okunabilecek şekilde olmalı (yaklaşık 70-100 kelime).
         * Gereksiz süsleme, uzun açıklama veya teknik jargon kullanma.
         * Sadece konuşma metnini yaz, başlık, açıklama veya ekstra bilgi ekleme.
         * Gerektiğinde sektöre uygun basit ve anlaşılır teknik ifadeler kullanabilirsin.`
          
        },
        {
          role: 'user',
          content: `Bu konu için bir video senaryosu yaz: ${topic}`
        }
      ],
      max_tokens: 300
    })
  });

  const data = await res.json();
  const script = data.choices[0].message.content;
  console.log('Senaryo:', script);
  return script;
}

async function main() {
  const topic = process.argv[2] || 'Singer dikiş makinelerinin avantajları';
  
  const script = await generateScript(topic);
  const videoPath = await generateHeygenVideo(
    script,
    process.env.HEYGEN_AVATAR_ID,
    process.env.HEYGEN_VOICE_ID
  );
  
  console.log('🎉 Video hazır:', videoPath);
}

main().catch(console.error);