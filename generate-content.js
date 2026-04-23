require('dotenv').config();
const { PRODUCT_CATALOG } = require('./productCatalog');

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function generateContent(product) {
  const prompt = `Sen İrfmak dikiş makinesi mağazasının Instagram içerik uzmanısın.
Aşağıdaki ürün için içerik üret:

Ürün: ${product.title}
Fiyat: ${product.priceText}
Kategori: ${product.category}
Link: ${product.url}

Şunu üret (JSON formatında, başka hiçbir şey yazma):
{
  "caption": "Instagram gönderisi için Türkçe caption (emoji kullan, 3-4 cümle)",
  "hashtags": "#dikiş #dikişmakinesi gibi 10 adet hashtag",
  "ad_copy": "Meta Ads için kısa reklam metni (1-2 cümle, satışa yönlendiren)"
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await res.json();
  const text = data.candidates[0].content.parts[0].text;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function getRandomProduct() {
  const inStock = PRODUCT_CATALOG.filter(p => p.inStock);
  return inStock[Math.floor(Math.random() * inStock.length)];
}

function getImageUrl(product) {
  const query = encodeURIComponent(`${product.title} sewing machine product photo white background`);
  return `https://image.pollinations.ai/prompt/${query}?width=1080&height=1080&nologo=true`;
}

async function main() {
  const product = getRandomProduct();
  console.log('Seçilen ürün:', product.title);

  const content = await generateContent(product);
  console.log('\n--- CAPTION ---');
  console.log(content.caption);
  console.log('\n--- HASHTAGS ---');
  console.log(content.hashtags);
  console.log('\n--- REKLAM METNİ ---');
  console.log(content.ad_copy);
  console.log('\n--- GÖRSEL URL ---');
  console.log(getImageUrl(product));
}

main().catch(console.error);