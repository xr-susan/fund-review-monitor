import db from '../database.js'

const noteRepo = {
  /**
   * 获取用户的所有笔记
   */
  findAll(userId) {
    const rows = db.prepare(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY date DESC'
    ).all(userId)
    return rows.map(this._parseRow)
  },

  /**
   * 根据ID查找笔记
   */
  findById(id) {
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
    return row ? this._parseRow(row) : null
  },

  /**
   * 创建笔记
   */
  create(note) {
    const stmt = db.prepare(`
      INSERT INTO notes (user_id, fund_code, fund_name, type, date, reason,
        expected_return, stop_loss, holding_period, actual_return, status, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      note.userId,
      note.fundCode,
      note.fundName || '',
      note.type,
      note.date,
      note.reason || '',
      note.expectedReturn || null,
      note.stopLoss || null,
      note.holdingPeriod || '',
      note.actualReturn || null,
      note.status || 'holding',
      JSON.stringify(note.tags || [])
    )

    return this.findById(result.lastInsertRowid)
  },

  /**
   * 更新笔记
   */
  update(id, updates) {
    const fields = []
    const values = []

    if (updates.fundCode !== undefined) { fields.push('fund_code = ?'); values.push(updates.fundCode) }
    if (updates.fundName !== undefined) { fields.push('fund_name = ?'); values.push(updates.fundName) }
    if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type) }
    if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date) }
    if (updates.reason !== undefined) { fields.push('reason = ?'); values.push(updates.reason) }
    if (updates.expectedReturn !== undefined) { fields.push('expected_return = ?'); values.push(updates.expectedReturn) }
    if (updates.stopLoss !== undefined) { fields.push('stop_loss = ?'); values.push(updates.stopLoss) }
    if (updates.holdingPeriod !== undefined) { fields.push('holding_period = ?'); values.push(updates.holdingPeriod) }
    if (updates.actualReturn !== undefined) { fields.push('actual_return = ?'); values.push(updates.actualReturn) }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)) }

    if (fields.length === 0) return this.findById(id)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  /**
   * 删除笔记
   */
  delete(id) {
    const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    return result.changes > 0
  },

  /**
   * 解析数据库行（JSON字段）
   */
  _parseRow(row) {
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]')
    }
  }
}

export default noteRepo
