import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 使用内存数据库进行测试
let testDb

export function setupTestDb() {
  testDb = new Database(':memory:')
  testDb.pragma('journal_mode = WAL')
  testDb.pragma('foreign_keys = ON')

  // 创建表结构
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fund_code TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, fund_code)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fund_code TEXT NOT NULL,
      fund_name TEXT,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      reason TEXT,
      expected_return REAL,
      stop_loss REAL,
      holding_period TEXT,
      actual_return REAL,
      status TEXT DEFAULT 'holding',
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `)

  return testDb
}

export function getTestDb() {
  return testDb
}

export function closeTestDb() {
  if (testDb) {
    testDb.close()
    testDb = null
  }
}

/**
 * 创建测试用户
 */
export function createTestUser(db, overrides = {}) {
  const bcrypt = require('bcryptjs')
  const defaults = {
    username: 'testuser',
    email: 'test@example.com',
    password_hash: bcrypt.hashSync('password123', 10),
    role: 'user'
  }

  const user = { ...defaults, ...overrides }

  const stmt = db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  )
  const result = stmt.run(user.username, user.email, user.password_hash, user.role)

  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
}

/**
 * 创建测试笔记
 */
export function createTestNote(db, userId, overrides = {}) {
  const defaults = {
    fund_code: '012922',
    fund_name: '易方达全球成长精选混合(QDII)人民币C',
    type: 'buy',
    date: '2024-01-10',
    reason: '看好消费复苏',
    expected_return: 15,
    stop_loss: -10,
    holding_period: '6个月',
    actual_return: 5.2,
    status: 'holding',
    tags: JSON.stringify(['#看好赛道', '#价值挖掘'])
  }

  const note = { ...defaults, ...overrides }

  const stmt = db.prepare(`
    INSERT INTO notes (user_id, fund_code, fund_name, type, date, reason,
      expected_return, stop_loss, holding_period, actual_return, status, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    userId,
    note.fund_code,
    note.fund_name,
    note.type,
    note.date,
    note.reason,
    note.expected_return,
    note.stop_loss,
    note.holding_period,
    note.actual_return,
    note.status,
    note.tags
  )

  return db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)
}
