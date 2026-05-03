require('dotenv').config();

const { exec } = require('child_process');

function run(command) {
  return new Promise((resolve, reject) => {
    console.log('\n▶️', command);

    exec(command, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

async function main() {
  const topic = process.argv.slice(2).join(' ') || 'Singer ve Pfaff dikiş makineleri';

  console.log('🎬 Video üretimi başlıyor...');
  await run(`node reels-agent-video.js "${topic}"`);

  console.log('📤 YouTube upload başlıyor...');
  await run('node upload-latest-youtube.js');

  console.log('\n✅ Otomasyon tamamlandı.');
}

main().catch(error => {
  console.error('\n❌ Otomasyon hatası:', error.message);
  process.exit(1);
});