/**
 * API 限流中间件
 * 基于内存的简单限流实现，生产环境建议使用 Redis
 */

const requestCounts = new Map()

// 清理过期记录（每5分钟）
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > data.windowMs) {
      requestCounts.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * 创建限流中间件
 * @param {Object} options - 配置选项
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 最大请求数
 * @param {string} options.message - 超限提示信息
 * @param {Function} options.keyGenerator - 生成限流键的函数
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 默认1分钟
    max = 100, // 默认100次
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress
  } = options

  return (req, res, next) => {
    const key = keyGenerator(req)
    const now = Date.now()

    let record = requestCounts.get(key)

    // 如果没有记录或窗口已过期，创建新记录
    if (!record || now - record.windowStart > windowMs) {
      record = {
        count: 0,
        windowStart: now,
        windowMs
      }
      requestCounts.set(key, record)
    }

    // 增加请求计数
    record.count++

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count))
    res.setHeader('X-RateLimit-Reset', new Date(record.windowStart + windowMs).toISOString())

    // 检查是否超限
    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000)
      })
    }

    next()
  }
}

/**
 * 通用 API 限流
 * 可通过环境变量 RATE_LIMIT_MAX 调整，默认 300次/分钟
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: parseInt(process.env.RATE_LIMIT_MAX) || 300,
  message: 'API 请求过于频繁，请稍后再试'
})

/**
 * 认证接口限流（更严格）
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 10次/15分钟
  message: '登录尝试过于频繁，请15分钟后再试',
  keyGenerator: (req) => {
    // 对登录接口使用更严格的限流
    return `auth:${req.body?.username || req.ip}`
  }
})

/**
 * 搜索接口限流
 */
export const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 30, // 30次/分钟
  message: '搜索请求过于频繁，请稍后再试'
})

export default {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  searchLimiter
}
