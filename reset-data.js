const fs = require("fs");
const path = require("path");
const { getDb } = require("./db");

const DATA_DIR = path.join(__dirname, "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const HANDOFFS_FILE = path.join(DATA_DIR, "handoffs.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function resetJsonFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  writeJson(SESSIONS_FILE, {});
  writeJson(HANDOFFS_FILE, []);
  writeJson(LEADS_FILE, []);

  console.log("JSON dosyaları temizlendi.");
}

async function resetSqliteData() {
  const db = await getDb();

  await db.exec(`
    DELETE FROM makbuzlar;
    DELETE FROM satislar;
    DELETE FROM urun_talepleri;
    DELETE FROM yetkili_yonlendirmeleri;
    DELETE FROM musteri_talepleri;
    DELETE FROM sohbet_mesajlari;
    DELETE FROM sohbet_oturumlari;
  `);

  await db.exec(`
    DELETE FROM sqlite_sequence
    WHERE name IN (
      'makbuzlar',
      'satislar',
      'urun_talepleri',
      'yetkili_yonlendirmeleri',
      'musteri_talepleri',
      'sohbet_mesajlari',
      'sohbet_oturumlari'
    );
  `);

  console.log("SQLite tablolarındaki veriler temizlendi.");
}

async function main() {
  try {
    await resetJsonFiles();
    await resetSqliteData();
    console.log("Tüm test verileri temizlendi.");
    process.exit(0);
  } catch (error) {
    console.error("Veri temizleme hatası:", error);
    process.exit(1);
  }
}

main();