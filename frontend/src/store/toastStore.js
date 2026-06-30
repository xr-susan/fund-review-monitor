import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set, get) => ({
  toasts: [],

  /**
   * 显示 Toast 消息
   * @param {string} message - 消息内容
   * @param {string} type - 类型: success | error | info | warning
   * @param {number} duration - 显示时长（毫秒），默认 3000
   */
  showToast: (message, type = 'info', duration = 3000) => {
    const id = ++toastId
    const toast = { id, message, type, duration }

    set(state => ({
      toasts: [...state.toasts, toast]
    }))

    // 自动移除
    setTimeout(() => {
      get().removeToast(id)
    }, duration)

    return id
  },

  /**
   * 移除 Toast
   */
  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  /**
   * 清除所有 Toast
   */
  clearToasts: () => {
    set({ toasts: [] })
  },

  // 快捷方法
  success: (message, duration) => get().showToast(message, 'success', duration),
  error: (message, duration) => get().showToast(message, 'error', duration),
  info: (message, duration) => get().showToast(message, 'info', duration),
  warning: (message, duration) => get().showToast(message, 'warning', duration)
}))
