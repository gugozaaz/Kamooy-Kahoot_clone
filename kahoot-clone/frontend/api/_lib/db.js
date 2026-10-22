import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DB_PATH || (
    fs.existsSync('/app') ? '/app/data/kamooy.db' : './data/kamooy.db'
  );

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      avatar TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS presentations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slides TEXT NOT NULL,
      settings TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_presentations_user ON presentations(user_id);
  `);

  dbInstance = db;
  return dbInstance;
}

export const dbService = {
  upsertUser({ id, email, name, avatar }) {
    const db = getDatabase();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO users (id, email, name, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        avatar = excluded.avatar,
        updated_at = excluded.updated_at
    `);
    stmt.run(id, email, name || '', avatar || '', now, now);

    return dbService.getUser(id);
  },

  getUser(id) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row || null;
  },

  getPresentations(userId) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM presentations 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `).all(userId);

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      slides: JSON.parse(r.slides || '[]'),
      settings: JSON.parse(r.settings || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  getPresentation(id, userId) {
    const db = getDatabase();
    const row = userId
      ? db.prepare('SELECT * FROM presentations WHERE id = ? AND user_id = ?').get(id, userId)
      : db.prepare('SELECT * FROM presentations WHERE id = ?').get(id);

    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      slides: JSON.parse(row.slides || '[]'),
      settings: JSON.parse(row.settings || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  savePresentation(userId, presentation) {
    const db = getDatabase();
    const { id, title, slides, settings, createdAt, updatedAt } = presentation;
    const nowIso = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO presentations (id, user_id, title, slides, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        slides = excluded.slides,
        settings = excluded.settings,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      userId,
      title || 'ชุดคำถามไม่มีชื่อ',
      JSON.stringify(slides || []),
      JSON.stringify(settings || { enablePowerups: false, showAnswerText: true }),
      createdAt || nowIso,
      updatedAt || nowIso
    );

    return dbService.getPresentation(id, userId);
  },

  deletePresentation(id, userId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM presentations WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
    return true;
  }
};
