/**
 * 错误码常量
 */
export const ErrorCode = {
  // 通用错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // 业务错误
  FUND_NOT_FOUND: 'FUND_NOT_FOUND',
  USER_EXISTS: 'USER_EXISTS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  NOTE_NOT_FOUND: 'NOTE_NOT_FOUND',
  WATCHLIST_DUPLICATE: 'WATCHLIST_DUPLICATE',

  // 外部服务错误
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
}

/**
 * 业务错误类
 */
export class AppError extends Error {
  constructor(message, code, statusCode = 400, details = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * 创建业务错误的快捷方法
 */
export function createError(message, code, statusCode = 400) {
  return new AppError(message, code, statusCode)
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(err, req, res, next) {
  // 记录错误日志
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  })

  // 业务错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details
    })
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: ErrorCode.UNAUTHORIZED,
      message: '令牌无效'
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: ErrorCode.UNAUTHORIZED,
      message: '令牌已过期'
    })
  }

  // 数据库错误
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({
      success: false,
      code: ErrorCode.VALIDATION_ERROR,
      message: '数据约束冲突'
    })
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    code: ErrorCode.INTERNAL_ERROR,
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
  })
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: ErrorCode.NOT_FOUND,
    message: `接口 ${req.method} ${req.path} 不存在`
  })
}
