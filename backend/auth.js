import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import userRepo from './repositories/userRepo.js'

// JWT 密钥（生产环境应该使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret-key' : 'dev-only-change-me')
const JWT_EXPIRES_IN = '7d'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production')
}

/**
 * 初始化默认管理员账户
 */
export function initDefaultUser() {
  if (process.env.DISABLE_DEFAULT_ADMIN === 'true') return

  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const existing = userRepo.findByUsername(username)
  if (!existing) {
    userRepo.create(username, bcrypt.hashSync(password, 10), email, 'admin')
    console.log(`Default admin account created (${username})`)
  }
}

/**
 * 生成 JWT Token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

/**
 * 用户注册
 */
export function register(username, password, email) {
  // 检查用户名是否已存在
  if (userRepo.findByUsername(username)) {
    return { success: false, error: '用户名已存在' }
  }

  // 检查邮箱是否已存在
  if (userRepo.findByEmail(email)) {
    return { success: false, error: '邮箱已被注册' }
  }

  // 创建新用户
  const passwordHash = bcrypt.hashSync(password, 10)
  const newUser = userRepo.create(username, passwordHash, email, 'user')

  // 生成 Token
  const token = generateToken(newUser)

  return {
    success: true,
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }
  }
}

/**
 * 用户登录
 */
export function login(username, password) {
  // 查找用户
  const user = userRepo.findByUsername(username)
  if (!user) {
    return { success: false, error: '用户名或密码错误' }
  }

  // 验证密码
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return { success: false, error: '用户名或密码错误' }
  }

  // 生成 Token
  const token = generateToken(user)

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  }
}

/**
 * 获取用户信息
 */
export function getUserById(id) {
  const user = userRepo.findById(id)
  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  }
}

/**
 * 更新用户信息
 */
export function updateUser(id, updates) {
  const user = userRepo.findById(id)
  if (!user) return { success: false, error: '用户不存在' }

  // 更新允许的字段
  const updateData = {}

  if (updates.email) {
    // 检查邮箱是否已被其他用户使用
    const existingUser = userRepo.findByEmail(updates.email)
    if (existingUser && existingUser.id !== id) {
      return { success: false, error: '邮箱已被其他用户使用' }
    }
    updateData.email = updates.email
  }

  if (updates.password) {
    updateData.passwordHash = bcrypt.hashSync(updates.password, 10)
  }

  if (updates.username) {
    const existingUser = userRepo.findByUsername(updates.username)
    if (existingUser && existingUser.id !== id) {
      return { success: false, error: '用户名已被使用' }
    }
    updateData.username = updates.username
  }

  const updatedUser = userRepo.update(id, updateData)

  return {
    success: true,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role
    }
  }
}

/**
 * 认证中间件
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }

  const token = authHeader.split(' ')[1]
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: '令牌无效或已过期' })
  }

  req.user = decoded
  next()
}

/**
 * 角色检查中间件
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' })
    }

    next()
  }
}

/**
 * 获取所有用户（管理员）
 */
export function getAllUsers() {
  return userRepo.findAll()
}

/**
 * 刷新 Token
 */
export function refreshToken(token) {
  try {
    // 验证旧 Token（即使过期也能解码）
    const decoded = jwt.decode(token)
    if (!decoded || !decoded.id) {
      return { success: false, error: '无效的令牌' }
    }

    // 检查用户是否存在
    const user = userRepo.findById(decoded.id)
    if (!user) {
      return { success: false, error: '用户不存在' }
    }

    // 生成新 Token
    const newToken = generateToken(user)

    return {
      success: true,
      token: newToken
    }
  } catch (error) {
    return { success: false, error: '刷新令牌失败' }
  }
}
