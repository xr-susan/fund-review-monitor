import { WebSocketServer } from 'ws'
import { getFundEstimate, getStockPrice } from './services/fundApi.js'

/**
 * WebSocket 服务 - 实时推送基金数据
 */
export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server })

  // 存储所有连接的客户端
  const clients = new Set()

  // 存储订阅的基金代码
  const subscriptions = new Map()

  wss.on('connection', (ws) => {
    console.log('📡 新的 WebSocket 连接')
    clients.add(ws)

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'connected',
      message: '连接成功',
      timestamp: new Date().toISOString()
    }))

    // 处理客户端消息
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString())
        handleMessage(ws, data)
      } catch (error) {
        console.error('解析消息失败:', error)
      }
    })

    // 处理断开连接
    ws.on('close', () => {
      console.log('📡 WebSocket 连接断开')
      clients.delete(ws)
      // 清理订阅
      for (const [code, subs] of subscriptions.entries()) {
        subs.delete(ws)
        if (subs.size === 0) {
          subscriptions.delete(code)
        }
      }
    })

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error)
      clients.delete(ws)
    })
  })

  // 处理客户端消息
  function handleMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        // 订阅基金数据
        subscribeFund(ws, data.code)
        break

      case 'unsubscribe':
        // 取消订阅
        unsubscribeFund(ws, data.code)
        break

      case 'ping':
        // 心跳检测
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break

      default:
        console.log('未知消息类型:', data.type)
    }
  }

  // 订阅基金数据
  function subscribeFund(ws, code) {
    if (!subscriptions.has(code)) {
      subscriptions.set(code, new Set())
    }
    subscriptions.get(code).add(ws)

    console.log(`📊 订阅基金: ${code}`)

    // 立即发送一次数据
    sendFundData(ws, code)
  }

  // 取消订阅
  function unsubscribeFund(ws, code) {
    if (subscriptions.has(code)) {
      subscriptions.get(code).delete(ws)
      if (subscriptions.get(code).size === 0) {
        subscriptions.delete(code)
      }
    }
    console.log(`📊 取消订阅基金: ${code}`)
  }

  // 发送基金数据给单个客户端
  async function sendFundData(ws, code) {
    try {
      const data = await getFundEstimate(code)
      if (data && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'fund-update',
          code: code,
          data: data,
          timestamp: new Date().toISOString()
        }))
      }
    } catch (error) {
      console.error(`发送基金 ${code} 数据失败:`, error.message)
    }
  }

  // 广播数据给所有订阅的客户端
  async function broadcastFundData() {
    for (const [code, subs] of subscriptions.entries()) {
      if (subs.size === 0) continue

      try {
        const data = await getFundEstimate(code)
        if (data) {
          const message = JSON.stringify({
            type: 'fund-update',
            code: code,
            data: data,
            timestamp: new Date().toISOString()
          })

          for (const ws of subs) {
            if (ws.readyState === 1) {
              ws.send(message)
            }
          }
        }
      } catch (error) {
        console.error(`广播基金 ${code} 数据失败:`, error.message)
      }
    }
  }

  // 定时广播（每分钟）
  setInterval(broadcastFundData, 60 * 1000)

  // 交易时间内更频繁更新（每30秒）
  const tradingInterval = setInterval(() => {
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const day = now.getDay()

    // 交易日 9:30-15:00
    if (day >= 1 && day <= 5 && ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 15))) {
      broadcastFundData()
    }
  }, 30 * 1000)

  // 清理定时器
  wss.on('close', () => {
    clearInterval(tradingInterval)
  })

  console.log('📡 WebSocket 服务已启动')

  return wss
}

/**
 * 广播消息给所有客户端
 */
export function broadcastMessage(wss, message) {
  const data = JSON.stringify(message)
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(data)
    }
  })
}
