import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'

// 设置测试环境变量
process.env.JWT_SECRET = 'test-secret-key'

const JWT_SECRET = 'test-secret-key'

describe('JWT Token 操作', () => {
  describe('生成 Token', () => {
    it('应该生成有效的 JWT Token', () => {
      const user = { id: 1, username: 'admin', role: 'admin' }
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      // 验证 token
      const decoded = jwt.verify(token, JWT_SECRET)
      expect(decoded.id).toBe(1)
      expect(decoded.username).toBe('admin')
      expect(decoded.role).toBe('admin')
    })

    it('应该包含过期时间', () => {
      const user = { id: 1, username: 'admin', role: 'admin' }
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })

      const decoded = jwt.decode(token, { complete: true })
      expect(decoded.payload.exp).toBeDefined()
      expect(decoded.payload.iat).toBeDefined()
    })
  })

  describe('验证 Token', () => {
    it('应该验证有效的 Token', () => {
      const user = { id: 1, username: 'admin', role: 'admin' }
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' })

      const decoded = jwt.verify(token, JWT_SECRET)
      expect(decoded).toBeDefined()
      expect(decoded.id).toBe(1)
      expect(decoded.username).toBe('admin')
    })

    it('应该拒绝无效的 Token', () => {
      expect(() => {
        jwt.verify('invalid-token', JWT_SECRET)
      }).toThrow()
    })

    it('应该拒绝使用错误密钥签名的 Token', () => {
      const user = { id: 1, username: 'admin', role: 'admin' }
      const token = jwt.sign(user, 'wrong-secret', { expiresIn: '1h' })

      expect(() => {
        jwt.verify(token, JWT_SECRET)
      }).toThrow()
    })
  })
})

describe('密码加密', () => {
  it('应该正确加密密码', () => {
    const password = 'mypassword123'
    const hash = bcrypt.hashSync(password, 10)

    expect(hash).toBeDefined()
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(0)
  })

  it('应该验证正确的密码', () => {
    const password = 'mypassword123'
    const hash = bcrypt.hashSync(password, 10)

    const isValid = bcrypt.compareSync(password, hash)
    expect(isValid).toBe(true)
  })

  it('应该拒绝错误的密码', () => {
    const password = 'mypassword123'
    const wrongPassword = 'wrongpassword'
    const hash = bcrypt.hashSync(password, 10)

    const isValid = bcrypt.compareSync(wrongPassword, hash)
    expect(isValid).toBe(false)
  })
})

describe('数据库用户操作', () => {
  let db

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('journal_mode = WAL')

    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  })

  afterEach(() => {
    db.close()
  })

  it('应该创建用户并查询', () => {
    const passwordHash = bcrypt.hashSync('password123', 10)

    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('testuser', 'test@example.com', passwordHash, 'user')

    expect(result.changes).toBe(1)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    expect(user.username).toBe('testuser')
    expect(user.email).toBe('test@example.com')
    expect(user.role).toBe('user')

    // 验证密码
    const isValid = bcrypt.compareSync('password123', user.password_hash)
    expect(isValid).toBe(true)
  })

  it('应该拒绝重复的用户名', () => {
    const passwordHash = bcrypt.hashSync('password123', 10)

    db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('testuser', 'test1@example.com', passwordHash, 'user')

    expect(() => {
      db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      ).run('testuser', 'test2@example.com', passwordHash, 'user')
    }).toThrow()
  })

  it('应该更新用户信息', () => {
    const passwordHash = bcrypt.hashSync('password123', 10)

    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('testuser', 'test@example.com', passwordHash, 'user')

    db.prepare('UPDATE users SET email = ? WHERE id = ?')
      .run('newemail@example.com', result.lastInsertRowid)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    expect(user.email).toBe('newemail@example.com')
  })
})
