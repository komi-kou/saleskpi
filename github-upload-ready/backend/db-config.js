const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 環境変数でデータベースタイプを判定
const DB_TYPE = process.env.DATABASE_URL ? 'postgresql' : 'sqlite';

let db;

if (DB_TYPE === 'postgresql') {
  // PostgreSQL設定（本番環境）
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // PostgreSQLクエリ実行用のラッパー
  db = {
    run: (query, params, callback) => {
      // SQLiteのINSERT OR REPLACEをPostgreSQLのON CONFLICT DO UPDATEに変換
      if (query.includes('INSERT OR REPLACE INTO daily_kpi')) {
        query = query.replace('INSERT OR REPLACE INTO', 'INSERT INTO');
        query += ` ON CONFLICT (user_id, date) DO UPDATE SET
          emails_sent_manual = EXCLUDED.emails_sent_manual,
          emails_sent_outsource = EXCLUDED.emails_sent_outsource,
          valid_emails_manual = EXCLUDED.valid_emails_manual,
          valid_emails_outsource = EXCLUDED.valid_emails_outsource,
          replies_received = EXCLUDED.replies_received,
          meetings_scheduled = EXCLUDED.meetings_scheduled,
          deals_closed = EXCLUDED.deals_closed,
          projects_created = EXCLUDED.projects_created,
          ongoing_projects = EXCLUDED.ongoing_projects,
          slide_views = EXCLUDED.slide_views,
          video_views = EXCLUDED.video_views,
          notes = EXCLUDED.notes`;
      }

      pool.query(query, params, (err, result) => {
        if (callback) {
          if (typeof callback === 'function') {
            callback.call({ lastID: result ? result.rows[0]?.id : null }, err);
          } else {
            callback(err);
          }
        }
      });
    },

    get: (query, params, callback) => {
      pool.query(query, params, (err, result) => {
        if (callback) {
          callback(err, result ? result.rows[0] : null);
        }
      });
    },

    all: (query, params, callback) => {
      pool.query(query, params, (err, result) => {
        if (callback) {
          callback(err, result ? result.rows : []);
        }
      });
    },

    serialize: (callback) => {
      callback();
    },

    // PostgreSQLテーブル作成
    initTables: async () => {
      const queries = [
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS kpi_goals (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          week_start DATE NOT NULL,
          emails_manual_target INTEGER DEFAULT 0,
          emails_outsource_target INTEGER DEFAULT 0,
          valid_emails_manual_target INTEGER DEFAULT 0,
          valid_emails_outsource_target INTEGER DEFAULT 0,
          reply_target INTEGER DEFAULT 0,
          reply_rate_target REAL DEFAULT 0,
          meetings_target INTEGER DEFAULT 0,
          meeting_rate_target REAL DEFAULT 0,
          deals_target INTEGER DEFAULT 0,
          deal_rate_target REAL DEFAULT 0,
          projects_target INTEGER DEFAULT 0,
          project_rate_target REAL DEFAULT 0,
          ongoing_projects_target INTEGER DEFAULT 0,
          slide_views_target INTEGER DEFAULT 0,
          slide_view_rate_target REAL DEFAULT 0,
          video_views_target INTEGER DEFAULT 0,
          video_view_rate_target REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS daily_kpi (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          date DATE NOT NULL,
          emails_sent_manual INTEGER DEFAULT 0,
          emails_sent_outsource INTEGER DEFAULT 0,
          valid_emails_manual INTEGER DEFAULT 0,
          valid_emails_outsource INTEGER DEFAULT 0,
          replies_received INTEGER DEFAULT 0,
          meetings_scheduled INTEGER DEFAULT 0,
          deals_closed INTEGER DEFAULT 0,
          projects_created INTEGER DEFAULT 0,
          ongoing_projects INTEGER DEFAULT 0,
          slide_views INTEGER DEFAULT 0,
          video_views INTEGER DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, date)
        )`,
        
        `CREATE TABLE IF NOT EXISTS user_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
          discord_webhook TEXT,
          email_notifications INTEGER DEFAULT 1,
          weekly_reminders INTEGER DEFAULT 1,
          daily_reminders INTEGER DEFAULT 1,
          reminder_time TEXT DEFAULT '18:00',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS weekly_reviews (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          week_start DATE NOT NULL,
          week_end DATE NOT NULL,
          achievements TEXT,
          challenges TEXT,
          improvements TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      for (const query of queries) {
        await pool.query(query);
      }
      console.log('PostgreSQL tables initialized');
    }
  };

} else {
  // SQLite設定（開発環境）
  const dbPath = './kpi_enhanced.db';
  const sqliteDb = new sqlite3.Database(dbPath);
  
  db = {
    run: sqliteDb.run.bind(sqliteDb),
    get: sqliteDb.get.bind(sqliteDb),
    all: sqliteDb.all.bind(sqliteDb),
    serialize: sqliteDb.serialize.bind(sqliteDb),
    
    initTables: () => {
      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS kpi_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          week_start DATE NOT NULL,
          emails_manual_target INTEGER DEFAULT 0,
          emails_outsource_target INTEGER DEFAULT 0,
          valid_emails_manual_target INTEGER DEFAULT 0,
          valid_emails_outsource_target INTEGER DEFAULT 0,
          reply_target INTEGER DEFAULT 0,
          reply_rate_target REAL DEFAULT 0,
          meetings_target INTEGER DEFAULT 0,
          meeting_rate_target REAL DEFAULT 0,
          deals_target INTEGER DEFAULT 0,
          deal_rate_target REAL DEFAULT 0,
          projects_target INTEGER DEFAULT 0,
          project_rate_target REAL DEFAULT 0,
          ongoing_projects_target INTEGER DEFAULT 0,
          slide_views_target INTEGER DEFAULT 0,
          slide_view_rate_target REAL DEFAULT 0,
          video_views_target INTEGER DEFAULT 0,
          video_view_rate_target REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS daily_kpi (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          date DATE NOT NULL,
          emails_sent_manual INTEGER DEFAULT 0,
          emails_sent_outsource INTEGER DEFAULT 0,
          valid_emails_manual INTEGER DEFAULT 0,
          valid_emails_outsource INTEGER DEFAULT 0,
          replies_received INTEGER DEFAULT 0,
          meetings_scheduled INTEGER DEFAULT 0,
          deals_closed INTEGER DEFAULT 0,
          projects_created INTEGER DEFAULT 0,
          ongoing_projects INTEGER DEFAULT 0,
          slide_views INTEGER DEFAULT 0,
          video_views INTEGER DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(user_id, date)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          discord_webhook TEXT,
          email_notifications INTEGER DEFAULT 1,
          weekly_reminders INTEGER DEFAULT 1,
          daily_reminders INTEGER DEFAULT 1,
          reminder_time TEXT DEFAULT '18:00',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS weekly_reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          week_start DATE NOT NULL,
          week_end DATE NOT NULL,
          achievements TEXT,
          challenges TEXT,
          improvements TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`);
      });
      console.log('SQLite tables initialized');
    }
  };
}

module.exports = { db, DB_TYPE };