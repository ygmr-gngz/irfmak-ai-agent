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

// 10 içerik türü × haftanın 7 günü × 2 çalışma (sabah/öğleden sonra)
// Her slot farklı bir içerik türüne karşılık gelir
const CONTENT_PLAN = [
  // Pazar (0) - Sabah & Öğleden Sonra
  { topic: 'Singer Heavy Duty 4452 inceleme: Ağır kumaşlar için güçlü performans', type: 'singer-urun' },
  { topic: 'Pfaff Expression 710 inceleme: Yaratıcılar için üst düzey makine', type: 'pfaff-urun' },

  // Pazartesi (1) - Sabah & Öğleden Sonra
  { topic: 'Singer vs Pfaff 2025: Hangi marka size uygun? Detaylı karşılaştırma', type: 'karsilastirma' },
  { topic: 'Dikiş makinesine yeni başlayanlar için eksiksiz rehber: İlk makinenizi nasıl seçersiniz?', type: 'yeni-baslayanlar' },

  // Salı (2) - Sabah & Öğleden Sonra
  { topic: 'Profesyonel dikiş teknikleri: Düz dikiş, zikzak ve overlok farkları', type: 'dikis-teknikleri' },
  { topic: 'Dikiş makinesi bakım ve temizlik rehberi: Ömür boyu sorunsuz kullanım için adım adım kılavuz', type: 'bakim-temizlik' },

  // Çarşamba (3) - Sabah & Öğleden Sonra
  { topic: 'Dikiş makinesinde iplik atlaması ve iğne kırılması: Nedenleri ve çözümleri', type: 'ariza-cozum' },
  { topic: 'Singer ve Pfaff orijinal yedek parça rehberi: Hangi parçayı ne zaman değiştirmelisiniz?', type: 'yedek-parca' },

  // Perşembe (4) - Sabah & Öğleden Sonra
  { topic: 'Dikiş makinesi aksesuarları: Baskı ayakları, iğneler ve ek aparatlar ne işe yarar?', type: 'aksesuar' },
  { topic: '2025 dikiş makinesi satın alma rehberi: Bütçenize göre en iyi model seçimi', type: 'satin-alma' },

  // Cuma (5) - Sabah & Öğleden Sonra
  { topic: 'Singer Brilliance 6180 inceleme: Ev kullanıcıları için mükemmel seçim', type: 'singer-urun' },
  { topic: 'Pfaff Passport 3.0 portatif dikiş makinesi: Özgür dikiş deneyimi', type: 'pfaff-urun' },

  // Cumartesi (6) - Sabah & Öğleden Sonra
  { topic: 'Mekanik mi elektronik mi? Dikiş makinesi türleri karşılaştırması', type: 'karsilastirma' },
  { topic: 'Terziler ve moda tasarımcıları için profesyonel dikiş ipuçları', type: 'dikis-teknikleri' }
];

function getDayPlan() {
  const now = new Date();
  const day = now.getDay();       // 0 (Pazar) - 6 (Cumartesi)
  const hour = now.getUTCHours(); // UTC saat (GitHub Actions UTC kullanır)
  const isAfternoon = hour >= 12;

  const index = day * 2 + (isAfternoon ? 1 : 0);
  const item = CONTENT_PLAN[index];

  console.log(`📅 Gün: ${['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][day]}`);
  console.log(`🕐 Çalışma: ${isAfternoon ? 'Öğleden Sonra (15:00 UTC)' : 'Sabah (06:00 UTC)'}`);
  console.log(`🎯 İçerik türü: ${item.type}`);

  return [item];
}

async function main() {
  const plan = getDayPlan();

  console.log('\n📋 Günlük otomasyon planı:', JSON.stringify(plan, null, 2));

  for (const item of plan) {
    console.log(`\n🎬 Video üretimi başlıyor: [${item.type}] - ${item.topic}`);

    await run(`node reels-agent-video.js "${item.topic}"`);

    console.log('\n📤 YouTube yükleme başlıyor...');
    await run('node upload-latest-youtube.js');

    console.log(`\n✅ Tamamlandı: ${item.type}`);
  }

  console.log('\n🏁 Günlük otomasyon tamamlandı.');
}

main().catch(error => {
  console.error('\n❌ Günlük otomasyon hatası:', error.message);
  process.exit(1);
});
