require('dotenv').config();

async function checkApi() {
  // Önce avatarları listele - API çalışıyor mu test et
  const res = await fetch('https://api.heygen.com/v2/avatars', {
    headers: {
      'X-Api-Key': process.env.HEYGEN_API_KEY
    }
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkApi();