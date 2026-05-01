require('dotenv').config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

async function listAvatars() {
  const res = await fetch('https://api.heygen.com/v2/avatars', {
    headers: {
      'X-Api-Key': HEYGEN_API_KEY
    }
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

listAvatars();