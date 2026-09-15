import { test, expect } from '@playwright/test'

/**
 * 仪表板已登录冒烟测试。
 *
 * 选择器说明：全部基于 frontend/src/components/Sidebar.jsx 的菜单项文案、
 * frontend/src/components/Header.jsx 的标题，以及 frontend/src/pages/*.jsx 的
 * 页面标题，没有引入组件里不存在的 data-testid。
 *
 * 网络说明：/api/** 全部被拦截并返回空数据，因此测试不依赖后端进程，
 * 也不依赖任何第三方基金接口。基金列表为空时 Dashboard 不会请求历史净值，
 * 图表区域自然处于空态。
 */

const FAKE_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.test-signature'

const DEMO_USER = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin'
}

// 对应 Sidebar.jsx 中 menuItems 的 label，顺序与源码一致
const NAV_ITEMS = [
  '仪表板',
  '基金监控',
  '持仓分析',
  '投资组合',
  '对标分析',
  '收益计算器',
  '复盘笔记',
  '预警设置'
]

async function mockApi(page) {
  const json = (route, body) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    })

  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url())

    if (pathname === '/api/funds') return json(route, [])
    if (pathname === '/api/benchmark') return json(route, {})
    if (pathname === '/api/notes') return json(route, [])

    return json(route, {})
  })
}

async function seedSession(page) {
  await page.addInitScript(
    ([token, user]) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    [FAKE_TOKEN, DEMO_USER]
  )
}

test.describe('仪表板（已登录）', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page)
    await mockApi(page)
    await page.goto('/')
  })

  test('加载仪表板并渲染主导航', async ({ page }) => {
    // 页面标题（Dashboard.jsx 的 h2）
    await expect(page.getByRole('heading', { name: '仪表板' })).toBeVisible()

    // 应用外壳：Header 品牌标题 + 侧边栏
    await expect(page.getByRole('heading', { name: '基金复盘监控' })).toBeVisible()

    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()

    for (const label of NAV_ITEMS) {
      await expect(sidebar.getByRole('button', { name: label })).toBeVisible()
    }

    // 侧边栏快速统计区块
    await expect(sidebar.getByText('快速统计')).toBeVisible()
    await expect(sidebar.getByText('监控基金')).toBeVisible()

    // 已登录状态：登录表单不应出现
    await expect(page.locator('form')).toHaveCount(0)
  })

  test('可以从侧边栏切换到复盘笔记页面', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()

    await sidebar.getByRole('button', { name: '复盘笔记' }).click()

    // NotesCenter.jsx 的页面标题
    await expect(page.getByRole('heading', { name: /投资决策中心/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: '仪表板' })).toHaveCount(0)
  })
})
