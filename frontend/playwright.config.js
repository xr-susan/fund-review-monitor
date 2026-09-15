import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',

    // index.html registers a Service Worker (public/sw.js) on window load, and
    // that worker handles every /api/* request through its own `fetch` listener
    // (networkFirst). Playwright's page.route() cannot intercept requests that a
    // Service Worker handles — the documented limitation is "page.route() will
    // not intercept requests intercepted by Service Worker". So the route mocks
    // in e2e/*.spec.js were silently bypassed: /api/auth/login went out to the
    // network, Vite proxied it to http://localhost:5000, and with no backend
    // running the browser got ECONNREFUSED. Blocking service workers restores
    // the mocks as the authoritative source for /api/**.
    //
    // This is a test-only setting; production keeps its Service Worker.
    serviceWorkers: 'block'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
