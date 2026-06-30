const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`

// Token 刷新状态
let isRefreshing = false
let refreshQueue = []

/**
 * 解析 JWT Token
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

/**
 * 检查 Token 是否即将过期（5分钟内）
 */
function isTokenExpiringSoon(token) {
  if (!token) return true
  const decoded = parseJwt(token)
  if (!decoded || !decoded.exp) return true
  const expiresIn = decoded.exp * 1000 - Date.now()
  return expiresIn < 5 * 60 * 1000 // 5分钟
}

/**
 * 认证服务
 */
export const authService = {
  /**
   * 用户登录
   */
  async login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    }

    return data
  },

  /**
   * 用户注册
   */
  async register(username, password, email) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    })

    const data = await response.json()

    if (data.success) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    }

    return data
  },

  /**
   * 用户登出
   */
  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  /**
   * 获取当前用户
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user')
      return userStr ? JSON.parse(userStr) : null
    } catch {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      return null
    }
  },

  /**
   * 获取 Token
   */
  getToken() {
    return localStorage.getItem('token')
  },

  /**
   * 检查是否已登录
   */
  isAuthenticated() {
    return !!this.getToken()
  },

  /**
   * 获取用户信息
   */
  async getProfile() {
    const token = this.getToken()
    if (!token) return null

    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      return data.user
    }

    return null
  },

  /**
   * 更新用户信息
   */
  async updateProfile(updates) {
    const token = this.getToken()
    if (!token) return { success: false, error: '未登录' }

    const response = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    })

    return await response.json()
  },

  /**
   * 刷新 Token
   */
  async refreshToken() {
    const token = this.getToken()
    if (!token) return null

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.token) {
          localStorage.setItem('token', data.token)
          return data.token
        }
      }
    } catch (error) {
      console.error('刷新 Token 失败:', error)
    }

    return null
  },

  /**
   * 带认证的请求（支持自动刷新 Token）
   */
  async authenticatedFetch(url, options = {}) {
    let token = this.getToken()

    if (!token) {
      throw new Error('未登录')
    }

    // 检查 Token 是否即将过期
    if (isTokenExpiringSoon(token)) {
      if (!isRefreshing) {
        isRefreshing = true
        const newToken = await this.refreshToken()
        isRefreshing = false

        if (newToken) {
          token = newToken
          // 处理等待队列
          refreshQueue.forEach(cb => cb(token))
          refreshQueue = []
        } else {
          // 刷新失败，登出
          this.logout()
          window.location.href = '/login'
          throw new Error('认证已过期')
        }
      } else {
        // 等待刷新完成
        token = await new Promise(resolve => {
          refreshQueue.push(resolve)
        })
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.status === 401) {
      this.logout()
      window.location.href = '/login'
      throw new Error('认证已过期')
    }

    return response
  }
}
