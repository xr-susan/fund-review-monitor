import { test, expect } from '@playwright/test'

test('loads the login screen', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('form')).toBeVisible()
  await expect(page.getByRole('button').filter({ hasText: /登录|鐧诲綍|Log in/i }).first()).toBeVisible()
})
