import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'

describe('数据库操作', () => {
  let db

  beforeEach(() => {
    // 使用内存数据库进行测试
    db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    // 创建表结构
    db.exec(`
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
  })

  afterEach(() => {
    db.close()
  })

  describe('用户表操作', () => {
    it('应该创建用户', () => {
      const passwordHash = bcrypt.hashSync('password123', 10)
      const stmt = db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      )
      const result = stmt.run('testuser', 'test@example.com', passwordHash, 'user')

      expect(result.changes).toBe(1)
      expect(result.lastInsertRowid).toBe(1)
    })

    it('应该拒绝重复的用户名', () => {
      const passwordHash = bcrypt.hashSync('password123', 10)
      const stmt = db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      )

      stmt.run('testuser', 'test1@example.com', passwordHash, 'user')

      expect(() => {
        stmt.run('testuser', 'test2@example.com', passwordHash, 'user')
      }).toThrow()
    })

    it('应该查询用户', () => {
      const passwordHash = bcrypt.hashSync('password123', 10)
      db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      ).run('testuser', 'test@example.com', passwordHash, 'user')

      const user = db.prepare('SELECT * FROM users WHERE username = ?').get('testuser')

      expect(user).toBeDefined()
      expect(user.username).toBe('testuser')
      expect(user.email).toBe('test@example.com')
      expect(user.role).toBe('user')
    })

    it('应该更新用户信息', () => {
      const passwordHash = bcrypt.hashSync('password123', 10)
      const result = db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      ).run('testuser', 'test@example.com', passwordHash, 'user')

      db.prepare('UPDATE users SET email = ? WHERE id = ?')
        .run('newemail@example.com', result.lastInsertRowid)

      const user = db.prepare('SELECT * FROM users WHERE id = ?')
        .get(result.lastInsertRowid)

      expect(user.email).toBe('newemail@example.com')
    })
  })

  describe('自选基金表操作', () => {
    let userId

    beforeEach(() => {
      const passwordHash = bcrypt.hashSync('password123', 10)
      const result = db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      ).run('testuser', 'test@example.com', passwordHash, 'user')
      userId = result.lastInsertRowid
    })

    it('应该添加自选基金', () => {
      const stmt = db.prepare(
        'INSERT INTO watchlist (user_id, fund_code) VALUES (?, ?)'
      )
      const result = stmt.run(userId, '110011')

      expect(result.changes).toBe(1)
    })

    it('应该拒绝重复的基金', () => {
      const stmt = db.prepare(
        'INSERT INTO watchlist (user_id, fund_code) VALUES (?, ?)'
      )
      stmt.run(userId, '110011')

      expect(() => {
        stmt.run(userId, '110011')
      }).toThrow()
    })

    it('应该查询用户的自选基金', () => {
      db.prepare('INSERT INTO watchlist (user_id, fund_code) VALUES (?, ?)')
        .run(userId, '110011')
      db.prepare('INSERT INTO watchlist (user_id, fund_code) VALUES (?, ?)')
        .run(userId, '003834')

      const watchlist = db.prepare(
        'SELECT fund_code FROM watchlist WHERE user_id = ?'
      ).all(userId)

      expect(watchlist).toHaveLength(2)
      expect(watchlist.map(w => w.fund_code)).toContain('110011')
      expect(watchlist.map(w => w.fund_code)).toContain('003834')
    })

    it('应该删除自选基金', () => {
      db.prepare('INSERT INTO watchlist (user_id, fund_code) VALUES (?, ?)')
        .run(userId, '110011')

      const result = db.prepare(
        'DELETE FROM watchlist WHERE user_id = ? AND fund_code = ?'
      ).run(userId, '110011')

      expect(result.changes).toBe(1)

      const watchlist = db.prepare(
        'SELECT fund_code FROM watchlist WHERE user_id = ?'
      ).all(userId)

      expect(watchlist).toHaveLength(0)
    })
  })

  describe('复盘笔记表操作', () => {
    let userId

    beforeEach(() => {
      const passwordHash = bcrypt.hashSync('password123', 10)
      const result = db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      ).run('testuser', 'test@example.com', passwordHash, 'user')
      userId = result.lastInsertRowid
    })

    it('应该创建笔记', () => {
      const stmt = db.prepare(`
        INSERT INTO notes (user_id, fund_code, fund_name, type, date, reason,
          expected_return, stop_loss, holding_period, actual_return, status, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        userId,
        '110011',
        '易方达中小盘混合',
        'buy',
        '2024-01-10',
        '看好消费复苏',
        15,
        -10,
        '6个月',
        5.2,
        'holding',
        JSON.stringify(['#看好赛道', '#价值挖掘'])
      )

      expect(result.changes).toBe(1)
      expect(result.lastInsertRowid).toBe(1)
    })

    it('应该查询用户的笔记', () => {
      const stmt = db.prepare(`
        INSERT INTO notes (user_id, fund_code, fund_name, type, date, reason, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(userId, '110011', '基金1', 'buy', '2024-01-10', '理由1', '[]')
      stmt.run(userId, '003834', '基金2', 'sell', '2024-01-11', '理由2', '[]')

      const notes = db.prepare('SELECT * FROM notes WHERE user_id = ?').all(userId)

      expect(notes).toHaveLength(2)
    })

    it('应该更新笔记', () => {
      const result = db.prepare(`
        INSERT INTO notes (user_id, fund_code, fund_name, type, date, reason, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, '110011', '基金1', 'buy', '2024-01-10', '理由1', '[]')

      db.prepare('UPDATE notes SET reason = ? WHERE id = ?')
        .run('更新后的理由', result.lastInsertRowid)

      const note = db.prepare('SELECT * FROM notes WHERE id = ?')
        .get(result.lastInsertRowid)

      expect(note.reason).toBe('更新后的理由')
    })

    it('应该删除笔记', () => {
      const result = db.prepare(`
        INSERT INTO notes (user_id, fund_code, fund_name, type, date, reason, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, '110011', '基金1', 'buy', '2024-01-10', '理由1', '[]')

      const deleteResult = db.prepare('DELETE FROM notes WHERE id = ?')
        .run(result.lastInsertRowid)

      expect(deleteResult.changes).toBe(1)

      const note = db.prepare('SELECT * FROM notes WHERE id = ?')
        .get(result.lastInsertRowid)

      expect(note).toBeUndefined()
    })

    it('应该解析 JSON 标签', () => {
      const tags = ['#看好赛道', '#价值挖掘']
      db.prepare(`
        INSERT INTO notes (user_id, fund_code, fund_name, type, date, reason, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, '110011', '基金1', 'buy', '2024-01-10', '理由1', JSON.stringify(tags))

      const note = db.prepare('SELECT * FROM notes WHERE user_id = ?').get(userId)
      const parsedTags = JSON.parse(note.tags)

      expect(parsedTags).toEqual(tags)
    })
  })
})
