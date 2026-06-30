import { AppError, ErrorCode } from './errorHandler.js'

/**
 * 清理字符串输入 - 防止 XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/[<>]/g, '') // 移除 HTML 标签字符
    .trim()
}

/**
 * 递归清理对象
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  return obj
}

/**
 * 请求验证中间件
 * @param {Object} schema - 验证规则
 * @returns {Function} Express中间件
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      const errors = []

      // 清理输入
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body)
      }
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query)
      }

      // 验证 body
      if (schema.body) {
        const bodyErrors = validateObject(req.body, schema.body, 'body')
        errors.push(...bodyErrors)
      }

      // 验证 params
      if (schema.params) {
        const paramErrors = validateObject(req.params, schema.params, 'params')
        errors.push(...paramErrors)
      }

      // 验证 query
      if (schema.query) {
        const queryErrors = validateObject(req.query, schema.query, 'query')
        errors.push(...queryErrors)
      }

      if (errors.length > 0) {
        throw new AppError(
          '请求参数验证失败',
          ErrorCode.VALIDATION_ERROR,
          400,
          errors
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * 验证对象
 */
function validateObject(data, rules, source) {
  const errors = []

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]

    // 必填验证
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: `${source}.${field}`,
        message: rule.message || `${field} 是必填项`
      })
      continue
    }

    // 如果值不存在且非必填，跳过其他验证
    if (value === undefined || value === null) {
      continue
    }

    // 类型验证
    if (rule.type) {
      if (!validateType(value, rule.type)) {
        errors.push({
          field: `${source}.${field}`,
          message: `${field} 类型必须是 ${rule.type}`
        })
        continue
      }
    }

    // 最小长度验证
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors.push({
        field: `${source}.${field}`,
        message: `${field} 长度不能小于 ${rule.minLength}`
      })
    }

    // 最大长度验证
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors.push({
        field: `${source}.${field}`,
        message: `${field} 长度不能大于 ${rule.maxLength}`
      })
    }

    // 正则验证
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push({
        field: `${source}.${field}`,
        message: rule.patternMessage || `${field} 格式不正确`
      })
    }

    // 枚举验证
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field: `${source}.${field}`,
        message: `${field} 必须是以下值之一: ${rule.enum.join(', ')}`
      })
    }
  }

  return errors
}

/**
 * 验证类型
 */
function validateType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && !isNaN(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'array':
      return Array.isArray(value)
    case 'object':
      return typeof value === 'object' && !Array.isArray(value)
    default:
      return true
  }
}

/**
 * 常用验证规则
 */
export const commonSchemas = {
  // 分页参数
  pagination: {
    query: {
      page: { type: 'string', pattern: /^\d+$/, patternMessage: 'page 必须是数字' },
      limit: { type: 'string', pattern: /^\d+$/, patternMessage: 'limit 必须是数字' }
    }
  },

  // ID 参数
  idParam: {
    params: {
      id: { required: true, type: 'string', pattern: /^\d+$/, patternMessage: 'id 必须是数字' }
    }
  },

  // 基金代码参数
  fundCode: {
    params: {
      code: { required: true, type: 'string', minLength: 6, maxLength: 6, pattern: /^\d{6}$/, patternMessage: '基金代码必须是6位数字' }
    }
  },

  // 用户注册
  register: {
    body: {
      username: {
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-zA-Z0-9_一-龥]+$/,
        patternMessage: '用户名只能包含字母、数字、下划线和中文'
      },
      password: {
        required: true,
        type: 'string',
        minLength: 6,
        maxLength: 100
      },
      email: {
        required: true,
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        patternMessage: '邮箱格式不正确'
      }
    }
  },

  // 用户登录
  login: {
    body: {
      username: { required: true, type: 'string', minLength: 1, maxLength: 50 },
      password: { required: true, type: 'string', minLength: 1, maxLength: 100 }
    }
  },

  // 创建笔记
  createNote: {
    body: {
      fund_code: {
        required: true,
        type: 'string',
        pattern: /^\d{6}$/,
        patternMessage: '基金代码必须是6位数字'
      },
      fund_name: { type: 'string', maxLength: 100 },
      type: {
        required: true,
        type: 'string',
        enum: ['buy', 'sell']
      },
      date: {
        required: true,
        type: 'string',
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        patternMessage: '日期格式必须是 YYYY-MM-DD'
      },
      reason: { type: 'string', maxLength: 1000 },
      expected_return: { type: 'string', pattern: /^-?\d*\.?\d*$/, patternMessage: '预期收益必须是数字' },
      stop_loss: { type: 'string', pattern: /^-?\d*\.?\d*$/, patternMessage: '止损必须是数字' },
      holding_period: { type: 'string', maxLength: 50 },
      tags: { type: 'array' }
    }
  },

  // 添加自选基金
  addToWatchlist: {
    body: {
      code: {
        required: true,
        type: 'string',
        pattern: /^\d{6}$/,
        patternMessage: '基金代码必须是6位数字'
      }
    }
  },

  // 搜索基金
  searchFund: {
    query: {
      keyword: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50
      }
    }
  },

  // 更新用户资料
  updateProfile: {
    body: {
      email: {
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        patternMessage: '邮箱格式不正确'
      },
      password: {
        type: 'string',
        minLength: 6,
        maxLength: 100
      }
    }
  }
}
