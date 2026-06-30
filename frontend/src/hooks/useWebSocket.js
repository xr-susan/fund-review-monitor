import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * WebSocket Hook - 实时数据推送
 */
export function useWebSocket(url) {
  const wsUrl = url || import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:5000`
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const reconnectTimer = useRef(null)
  const subscribers = useRef(new Map())

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    try {
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('📡 WebSocket 已连接')
        setConnected(true)

        // 重新订阅
        for (const code of subscribers.current.keys()) {
          ws.current.send(JSON.stringify({ type: 'subscribe', code }))
        }
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)

          // 触发订阅回调
          if (data.type === 'fund-update' && subscribers.current.has(data.code)) {
            const callback = subscribers.current.get(data.code)
            if (callback) callback(data.data)
          }
        } catch (error) {
          console.error('解析消息失败:', error)
        }
      }

      ws.current.onclose = () => {
        console.log('📡 WebSocket 连接断开')
        setConnected(false)

        // 自动重连
        reconnectTimer.current = setTimeout(() => {
          console.log('📡 尝试重新连接...')
          connect()
        }, 5000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        setConnected(false)
      }
    } catch (error) {
      console.error('创建 WebSocket 失败:', error)
    }
  }, [url])

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
    setConnected(false)
  }, [])

  // 订阅基金数据
  const subscribe = useCallback((code, callback) => {
    subscribers.current.set(code, callback)

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'subscribe', code }))
    }
  }, [])

  // 取消订阅
  const unsubscribe = useCallback((code) => {
    subscribers.current.delete(code)

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'unsubscribe', code }))
    }
  }, [])

  // 发送消息
  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }, [])

  // 心跳检测
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    return () => clearInterval(pingInterval)
  }, [])

  // 连接和断开
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    connected,
    lastMessage,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect
  }
}

/**
 * 基金实时数据 Hook
 */
export function useFundRealtime(fundCode) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { subscribe, unsubscribe, connected } = useWebSocket()

  useEffect(() => {
    if (!fundCode || !connected) return

    setLoading(true)

    subscribe(fundCode, (newData) => {
      setData(newData)
      setLoading(false)
    })

    return () => {
      unsubscribe(fundCode)
    }
  }, [fundCode, connected, subscribe, unsubscribe])

  return { data, loading, connected }
}
