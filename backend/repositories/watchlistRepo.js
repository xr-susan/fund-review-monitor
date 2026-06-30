import db from '../database.js'

const watchlistRepo = {
  /**
   * 获取用户的自选基金列表
   */
  findByUserId(userId) {
    return db.prepare(
      'SELECT fund_code, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at DESC'
    ).all(userId)
  },

  /**
   * 添加自选基金
   */
  add(userId, fundCode) {
    try {
      db.prepare(
        'INSERT INTO watchlist (user_id, fund_code) VALUES (?, ?)'
      ).run(userId, fundCode)
      return true
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        return false // 已存在
      }
      throw error
    }
  },

  /**
   * 删除自选基金
   */
  remove(userId, fundCode) {
    const result = db.prepare(
      'DELETE FROM watchlist WHERE user_id = ? AND fund_code = ?'
    ).run(userId, fundCode)
    return result.changes > 0
  },

  /**
   * 检查基金是否在自选列表中
   */
  exists(userId, fundCode) {
    const row = db.prepare(
      'SELECT 1 FROM watchlist WHERE user_id = ? AND fund_code = ?'
    ).get(userId, fundCode)
    return !!row
  },

  /**
   * 获取所有用户的自选基金（去重）
   */
  findAllFundCodes() {
    return db.prepare(
      'SELECT DISTINCT fund_code FROM watchlist'
    ).all().map(row => row.fund_code)
  }
}

export default watchlistRepo
