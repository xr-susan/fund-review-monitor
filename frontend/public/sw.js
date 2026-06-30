const CACHE_NAME = 'fund-monitor-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 缓存静态资源')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('🗑️ 删除旧缓存:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// 请求拦截 - 缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API 请求使用 Network First 策略
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // 静态资源使用 Cache First 策略
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // HTML 请求使用 Network First 策略
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request))
    return
  }

  // 其他请求直接走网络
  event.respondWith(fetch(request))
})

// Cache First 策略
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.error('Cache First 失败:', error)
    throw error
  }
}

// Network First 策略
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('网络请求失败，尝试从缓存获取:', request.url)
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }

    // 如果是 HTML 请求且没有缓存，返回离线页面
    if (request.destination === 'document') {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>基金监控 - 离线</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
              .container { text-align: center; }
              h1 { font-size: 2rem; margin-bottom: 1rem; }
              p { color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📡 网络连接失败</h1>
              <p>请检查您的网络连接后重试</p>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    throw error
  }
}

// 监听消息
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
