require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG = 'C:\\ffmpeg\\bin\\ffmpeg.exe';

async function downloadImage(url, outputPath) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  console.log('Görsel indirildi:', outputPath);
}

async function createReels(product, content) {
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    product.title + ' sewing machine product photo white background'
  )}?width=1080&height=1080&nologo=true`;

  const imagePath = path.join(tmpDir, 'product.jpg');
  const outputPath = path.join(tmpDir, `reels_${Date.now()}.mp4`);

  console.log('Görsel indiriliyor...');
  await downloadImage(imageUrl, imagePath);

  const caption = content.caption.replace(/'/g, '').substring(0, 60);
  const price = product.priceText;
  const title = product.title.replace(/'/g, '').substring(0, 40);

  console.log('Video oluşturuluyor...');
  const cmd = `${FFMPEG} -y \
    -loop 1 -i "${imagePath}" \
    -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,\
zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',\
drawtext=text='${title}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=200:box=1:boxcolor=black@0.5:boxborderw=10,\
drawtext=text='${price}':fontcolor=yellow:fontsize=56:x=(w-text_w)/2:y=280:box=1:boxcolor=black@0.5:boxborderw=10,\
drawtext=text='irfmak.com':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h-120:box=1:boxcolor=black@0.6:boxborderw=8" \
    -t 15 -r 30 -c:v libx264 -pix_fmt yuv420p \
    "${outputPath}"`;

  execSync(cmd, { stdio: 'inherit' });
  console.log('\n✅ Video hazır:', outputPath);
  return outputPath;
}

module.exports = { createReels };