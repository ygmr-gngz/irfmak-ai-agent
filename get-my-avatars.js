require('dotenv').config();

async function getMyAvatars() {
  const res = await fetch('https://api.heygen.com/v2/avatars', {
    headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY }
  });

  const data = await res.json();
  
  // Sadece kendi avatarlarını göster (talking_photo)
  const myAvatars = data.data?.talking_photos || [];
  console.log('Kendi avatarlarım:');
  myAvatars.forEach(a => {
    console.log(`İsim: ${a.talking_photo_name} | ID: ${a.talking_photo_id}`);
  });
}

getMyAvatars();