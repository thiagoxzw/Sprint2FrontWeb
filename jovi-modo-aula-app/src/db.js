const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { dataDir } = require("./runtime-paths");

const dbPath = path.join(dataDir, "app.db");

function createAdapter(rawDb) {
  return {
    exec(sql) {
      rawDb.exec(sql);
    },
    run(sql, params = []) {
      const stmt = rawDb.prepare(sql);
      const result = stmt.run(...params);
      return {
        changes: result.changes,
        lastID: Number(result.lastInsertRowid || 0)
      };
    },
    get(sql, params = []) {
      const stmt = rawDb.prepare(sql);
      return stmt.get(...params);
    },
    all(sql, params = []) {
      const stmt = rawDb.prepare(sql);
      return stmt.all(...params);
    }
  };
}

async function initDb() {
  const rawDb = new DatabaseSync(dbPath);
  const db = createAdapter(rawDb);

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      note TEXT DEFAULT '',
      image_path TEXT DEFAULT '',
      audio_path TEXT DEFAULT '',
      ocr_text TEXT DEFAULT '',
      ai_json TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
  `);

  return db;
}

module.exports = {
  initDb
};
