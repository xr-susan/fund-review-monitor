import { test, expect } from '@playwright/test'

/**
 * 登录与认证相关的端到端测试。
 *
 * 选择器说明：全部基于 frontend/src/pages/Login.jsx 与
 * frontend/src/components/Header.jsx 中真实渲染的内容（placeholder、
 * 可见文案、role），没有引入组件里不存在的 data-testid。
 *
 * 网络说明：Playwright 的 webServer 只启动 Vite 开发服务器，不启动后端，
 * 因此这里统一用 page.route 拦截 /api/** 并返回固定的假响应，
 * 既不依赖后端进程，也不依赖任何第三方基金接口。
 */

// 与 backend/auth.js 的 JWT 载荷保持一致（id / username / role），仅用于前端断言
const FAKE_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.test-signature'

const DEMO_USER = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin'
}

const VALID_CREDENTIALS = { username: 'admin', password: 'admin123' }

/**
 * 拦截后端接口，让前端完全离线运行。
 * @returns {{login: number}} 记录登录接口被调用的次数
 */
async function mockApi(page, { loginStatus = 200, loginBody } = {}) {
  const calls = { login: 0 }

  const json = (route, status, body) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body)
    })

  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url())

    if (pathname === '/api/auth/login') {
      calls.login += 1
      return json(
        route,
        loginStatus,
        loginBody ?? { success: true, token: FAKE_TOKEN, user: DEMO_USER }
      )
    }

    // 登录成功后 App / Dashboard 会加载这些数据，返回空数据即可
    if (pathname === '/api/funds') return json(route, 200, [])
    if (pathname === '/api/benchmark') return json(route, 200, {})
    if (pathname === '/api/notes') return json(route, 200, [])

    return json(route, 200, {})
  })

  return calls
}

/**
 * 预置已登录状态：App.jsx 通过 authService.getCurrentUser() 读取
 * localStorage 中的 user 来决定是否渲染登录页。
 */
async function seedSession(page) {
  await page.addInitScript(
    ([token, user]) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    [FAKE_TOKEN, DEMO_USER]
  )
}

const readStored = (page, key) =>
  page.evaluate((k) => localStorage.getItem(k), key)

test.describe('登录页', () => {
  test('渲染登录表单', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: '基金复盘监控系统' })).toBeVisible()
    await expect(page.locator('form')).toBeVisible()
    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible()
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible()
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  })

  test('使用有效凭据登录后进入仪表板并持久化令牌', async ({ page }) => {
    const calls = await mockApi(page)
    await page.goto('/')

    await page.getByPlaceholder('请输入用户名').fill(VALID_CREDENTIALS.username)
    await page.getByPlaceholder('请输入密码').fill(VALID_CREDENTIALS.password)
    await page.getByRole('button', { name: '登录', exact: true }).click()

    // 登录成功后 App 用 user 渲染应用外壳，Dashboard 为懒加载页面
    await expect(page.getByRole('heading', { name: '仪表板' })).toBeVisible()
    await expect(page.locator('form')).toHaveCount(0)

    expect(calls.login).toBe(1)
    expect(await readStored(page, 'token')).toBe(FAKE_TOKEN)
    expect(JSON.parse(await readStored(page, 'user'))).toMatchObject({
      username: 'admin',
      role: 'admin'
    })
  })

  test('密码错误时显示错误提示且不保存令牌', async ({ page }) => {
    await mockApi(page, {
      loginStatus: 401,
      loginBody: { success: false, error: '用户名或密码错误' }
    })
    await page.goto('/')

    await page.getByPlaceholder('请输入用户名').fill(VALID_CREDENTIALS.username)
    await page.getByPlaceholder('请输入密码').fill('wrong-password')
    await page.getByRole('button', { name: '登录', exact: true }).click()

    // Login.jsx 在 result.success 为假时把 result.error 渲染到错误框
    await expect(page.getByText('用户名或密码错误')).toBeVisible()

    // 仍停留在登录页，且没有写入任何登录态
    await expect(page.getByRole('heading', { name: '基金复盘监控系统' })).toBeVisible()
    expect(await readStored(page, 'token')).toBeNull()
    expect(await readStored(page, 'user')).toBeNull()
  })

  test('用户名或密码为空时提交被原生校验拦截', async ({ page }) => {
    const calls = await mockApi(page)
    await page.goto('/')

    await page.getByRole('button', { name: '登录', exact: true }).click()

    // Login.jsx 的两个输入都带 required，浏览器原生校验会阻止表单提交
    const usernameInput = page.getByPlaceholder('请输入用户名')
    const passwordInput = page.getByPlaceholder('请输入密码')

    const usernameValidity = await usernameInput.evaluate((el) => ({
      valid: el.validity.valid,
      valueMissing: el.validity.valueMissing
    }))
    const passwordValidity = await passwordInput.evaluate((el) => ({
      valid: el.validity.valid,
      valueMissing: el.validity.valueMissing
    }))

    expect(usernameValidity.valid).toBe(false)
    expect(usernameValidity.valueMissing).toBe(true)
    expect(passwordValidity.valid).toBe(false)
    expect(passwordValidity.valueMissing).toBe(true)

    // 未发起登录请求，也没有写入登录态
    expect(calls.login).toBe(0)
    expect(await readStored(page, 'token')).toBeNull()
    await expect(page.getByRole('heading', { name: '基金复盘监控系统' })).toBeVisible()
  })

  test('退出登录会清除令牌并回到登录页', async ({ page }) => {
    await mockApi(page)
    await seedSession(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: '仪表板' })).toBeVisible()

    // Header 的用户菜单按钮以当前用户名作为可见文案，下拉中才有「退出登录」
    await page.getByRole('button', { name: /admin/ }).click()
    await page.getByRole('button', { name: '退出登录' }).click()

    await expect(page.getByRole('heading', { name: '基金复盘监控系统' })).toBeVisible()
    await expect(page.locator('form')).toBeVisible()

    expect(await readStored(page, 'token')).toBeNull()
    expect(await readStored(page, 'user')).toBeNull()
  })

  test('未登录访问仪表板路径时渲染登录页', async ({ page }) => {
    await mockApi(page)

    // 应用没有路由库：App.jsx 仅根据 localStorage 中的 user 决定渲染内容，
    // 因此深链接同样落在登录页。Vite 开发服务器对无扩展名路径回退到 index.html。
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: '基金复盘监控系统' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '仪表板' })).toHaveCount(0)
    await expect(page.locator('aside')).toHaveCount(0)

    expect(await readStored(page, 'token')).toBeNull()
  })
})
