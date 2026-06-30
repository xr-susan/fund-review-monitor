import db from '../database.js'

const userRepo = {
  /**
   * 根据ID查找用户
   */
  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  },

  /**
   * 根据用户名查找用户
   */
  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  },

  /**
   * 根据邮箱查找用户
   */
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  },

  /**
   * 创建用户
   */
  create(username, passwordHash, email, role = 'user') {
    const stmt = db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    )
    const result = stmt.run(username, email, passwordHash, role)
    return this.findById(result.lastInsertRowid)
  },

  /**
   * 更新用户信息
   */
  update(id, updates) {
    const fields = []
    const values = []

    if (updates.username) {
      fields.push('username = ?')
      values.push(updates.username)
    }
    if (updates.email) {
      fields.push('email = ?')
      values.push(updates.email)
    }
    if (updates.passwordHash) {
      fields.push('password_hash = ?')
      values.push(updates.passwordHash)
    }
    if (updates.role) {
      fields.push('role = ?')
      values.push(updates.role)
    }

    if (fields.length === 0) return this.findById(id)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  /**
   * 获取所有用户
   */
  findAll() {
    return db.prepare('SELECT id, username, email, role, created_at FROM users').all()
  }
}

export default userRepo
