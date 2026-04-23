require('dotenv').config();
const { PRODUCT_CATALOG } = require('./productCatalog');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function getRandomProduct() {
  const inStock = PRODUCT_CATALOG.filter(p => p.inStock);
  const evTipi = inStock.filter(p => p.category === 'ev_tipi');
  const diger = inStock.filter(p => p.category !== 'ev_tipi');
  const rand = Math.random();
  const pool = (rand < 0.8 && evTipi.length > 0) ? evTipi : diger;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getImageUrl(product) {
  const query = encodeURIComponent(`${product.title} sewing machine product photo white background`);
  return `https://image.pollinations.ai/prompt/${query}?width=1080&height=1080&nologo=true`;
}

async function generateContent(product) {
  const isEvTipi = product.category === 'ev_tipi';
  const prompt = `Sen İrfmak dikiş makinesi mağazasının Instagram içerik uzmanısın.
Hedef kitle: ${isEvTipi ? 'Evde dikiş yapmayı seven kadınlar, hobiciler' : 'Profesyoneller, atölyeler, sanayi kullanıcıları'}

Aşağıdaki ürün için içerik üret:
Ürün: ${product.title}
Fiyat: ${product.priceText}
Kategori: ${product.category}
Link: ${product.url}

Şunu üret (JSON formatında, başka hiçbir şey yazma):
{
  "caption": "Instagram gönderisi için Türkçe caption (emoji kullan, 3-4 cümle, hedef kitleye hitap et)",
  "hashtags": "#dikiş #dikişmakinesi gibi 10 adet hashtag",
  "ad_copy": "Meta Ads için kısa reklam metni (1-2 cümle, satışa yönlendiren)"
}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  const text = completion.choices[0].message.content;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function sendTelegram(product, content) {
  const imageUrl = getImageUrl(product);
  const kategori = product.category === 'ev_tipi' ? '🏠 Ev Tipi' : '🏭 Profesyonel';
  const message = `
🆕 *YENİ İÇERİK HAZIR*

📦 *Ürün:* ${product.title}
💰 *Fiyat:* ${product.priceText}
🏷 *Kategori:* ${kategori}

📝 *Caption:*
${content.caption}

#️⃣ *Hashtag:*
${content.hashtags}

📣 *Reklam Metni:*
${content.ad_copy}

🖼 *Görsel:* ${imageUrl}
🔗 *Ürün Linki:* ${product.url}

✅ Onaylıyor musun?
`;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  });

  console.log('Telegram mesajı gönderildi!');
}

async function main() {
  const product = getRandomProduct();
  console.log('Seçilen ürün:', product.title);
  console.log('Kategori:', product.category);

  const content = await generateContent(product);
  console.log('\n--- CAPTION ---');
  console.log(content.caption);
  console.log('\n--- HASHTAGS ---');
  console.log(content.hashtags);
  console.log('\n--- REKLAM METNİ ---');
  console.log(content.ad_copy);

  await sendTelegram(product, content);
}

main().catch(console.error);