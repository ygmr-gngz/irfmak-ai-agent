require('dotenv').config();

async function listTemplates() {
  const res = await fetch('https://api.heygen.com/v2/templates', {
    headers: {
      'X-Api-Key': process.env.HEYGEN_API_KEY
    }
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

listTemplates();