const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "irfmak.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await dbInstance.exec("PRAGMA foreign_keys = ON;");
  return dbInstance;
}

async function initDb() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sohbet_oturumlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oturum_kodu TEXT NOT NULL UNIQUE,
      olusturulma_tarihi TEXT NOT NULL,
      guncellenme_tarihi TEXT NOT NULL,
      durum TEXT DEFAULT 'aktif'
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sohbet_mesajlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oturum_id INTEGER NOT NULL,
      gonderen_tipi TEXT NOT NULL,
      mesaj TEXT NOT NULL,
      tarih TEXT NOT NULL,
      FOREIGN KEY (oturum_id) REFERENCES sohbet_oturumlari(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS musteri_talepleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oturum_kodu TEXT NOT NULL,
      musteri_adi TEXT,
      musteri_telefonu TEXT,
      talep_turu TEXT,
      talep_etiketi TEXT,
      aciklama TEXT,
      durum TEXT DEFAULT 'yeni',
      olusturulma_tarihi TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS yetkili_yonlendirmeleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oturum_kodu TEXT NOT NULL,
      musteri_adi TEXT,
      musteri_telefonu TEXT,
      yonlendirme_nedeni TEXT,
      yonlendirme_etiketi TEXT,
      ozet TEXT,
      whatsapp_linki TEXT,
      tamamlandi_mi INTEGER DEFAULT 1,
      olusturulma_tarihi TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS urun_talepleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oturum_kodu TEXT NOT NULL,
      urun_adi TEXT,
      kategori TEXT,
      makine_tipi TEXT,
      talep_tarihi TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS satislar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      musteri_adi TEXT,
      musteri_telefonu TEXT,
      urun_adi TEXT,
      aciklama TEXT,
      tutar REAL DEFAULT 0,
      para_birimi TEXT DEFAULT 'TRY',
      odeme_tipi TEXT,
      durum TEXT DEFAULT 'tamamlandi',
      olusturulma_tarihi TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS makbuzlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      satis_id INTEGER NOT NULL,
      makbuz_no TEXT NOT NULL,
      makbuz_tarihi TEXT NOT NULL,
      toplam_tutar REAL DEFAULT 0,
      notlar TEXT,
      FOREIGN KEY (satis_id) REFERENCES satislar(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sohbet_oturumlari_oturum_kodu
    ON sohbet_oturumlari (oturum_kodu);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sohbet_mesajlari_oturum_id
    ON sohbet_mesajlari (oturum_id);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_musteri_talepleri_oturum_kodu
    ON musteri_talepleri (oturum_kodu);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_musteri_talepleri_durum
    ON musteri_talepleri (durum);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_yetkili_yonlendirmeleri_oturum_kodu
    ON yetkili_yonlendirmeleri (oturum_kodu);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_satislar_tarih
    ON satislar (olusturulma_tarihi);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_makbuzlar_satis_id
    ON makbuzlar (satis_id);
  `);

  return db;
}

module.exports = {
  getDb,
  initDb,
};