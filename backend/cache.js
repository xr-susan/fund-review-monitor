/**
 * 数据缓存服务
 * 使用内存缓存 + 可选的 Redis 缓存
 */

class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map()
    this.maxSize = options.maxSize || 1000
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000 // 5分钟
    this.checkInterval = options.checkInterval || 60 * 1000 // 1分钟

    // 定期清理过期缓存
    this.cleanupTimer = setInterval(() => this.cleanup(), this.checkInterval)
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl = this.defaultTTL) {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    })
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值或null
   */
  get(key) {
    const item = this.cache.get(key)

    if (!item) return null

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear()
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
    }
  }

  /**
   * 获取或设置缓存（如果不存在则调用函数获取）
   * @param {string} key - 缓存键
   * @param {Function} fetchFn - 获取数据的函数
   * @param {number} ttl - 过期时间
   */
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    const value = await fetchFn()
    this.set(key, value, ttl)
    return value
  }

  /**
   * 销毁缓存
   */
  destroy() {
    clearInterval(this.cleanupTimer)
    this.cache.clear()
  }
}

// 创建缓存实例
export const fundCache = new MemoryCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000 // 5分钟
})

export const stockCache = new MemoryCache({
  maxSize: 1000,
  defaultTTL: 1 * 60 * 1000 // 1分钟（股票数据更新更频繁）
})

export const holdingsCache = new MemoryCache({
  maxSize: 100,
  defaultTTL: 30 * 60 * 1000 // 30分钟（持仓数据变化不频繁）
})

export const navHistoryCache = new MemoryCache({
  maxSize: 200,
  defaultTTL: 60 * 60 * 1000 // 1小时（历史净值变化不频繁）
})

/**
 * 缓存中间件
 */
export function cacheMiddleware(cacheInstance, keyFn, ttl) {
  return async (req, res, next) => {
    const key = keyFn(req)

    try {
      const cached = cacheInstance.get(key)
      if (cached) {
        return res.json(cached)
      }

      // 保存原始的 res.json
      const originalJson = res.json.bind(res)

      // 重写 res.json 以缓存响应
      res.json = (data) => {
        cacheInstance.set(key, data, ttl)
        return originalJson(data)
      }

      next()
    } catch (error) {
      next()
    }
  }
}

/**
 * 清除指定基金的缓存
 */
export function clearFundCache(fundCode) {
  fundCache.delete(`fund:${fundCode}`)
  holdingsCache.delete(`holdings:${fundCode}`)
  navHistoryCache.delete(`nav:${fundCode}`)
}

/**
 * 清除所有缓存
 */
export function clearAllCache() {
  fundCache.clear()
  stockCache.clear()
  holdingsCache.clear()
  navHistoryCache.clear()
}

export default MemoryCache
