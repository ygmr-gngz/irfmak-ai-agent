require('dotenv').config();

const { exec } = require('child_process');

function run(command) {
  return new Promise((resolve, reject) => {
    console.log('\n▶️', command);

    exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

function getDayPlan() {
  const day = new Date().getDay();

  // 0 Pazar, 1 Pazartesi, 2 Salı, 3 Çarşamba, 4 Perşembe, 5 Cuma, 6 Cumartesi

  if ([1, 3, 5].includes(day)) {
    return [
      { topic: 'Singer dikiş makineleri', type: 'singer' },
      { topic: 'Pfaff dikiş makineleri neden tercih edilir', type: 'pfaff' }
    ];
  }

  if ([2, 4, 6].includes(day)) {
    return [
      { topic: 'Doğru dikiş makinesi seçimi', type: 'mixed' }
    ];
  }

  return [
    { topic: 'Singer ve Pfaff dikiş makineleri', type: 'mixed' }
  ];
}

async function main() {
  const plan = getDayPlan();

  console.log('📅 Günlük otomasyon planı:', plan);

  for (const item of plan) {
    console.log(`\n🎬 Video üretimi: ${item.type} - ${item.topic}`);

    await run(`node reels-agent-video.js "${item.topic}" ${item.type}`);

    console.log('\n📤 YouTube upload başlıyor...');
    await run('node upload-latest-youtube.js');
  }

  console.log('\n✅ Günlük otomasyon tamamlandı.');
}

main().catch(error => {
  console.error('\n❌ Günlük otomasyon hatası:', error.message);
  process.exit(1);
});