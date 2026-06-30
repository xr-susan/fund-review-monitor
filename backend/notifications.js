/**
 * 通知服务 - 支持多种通知方式
 */

import nodemailer from 'nodemailer'

export const DEFAULT_ALERT_RULES = [
  { id: 'daily-drop', type: 'fund_drop', fundCode: 'all', threshold: 3, enabled: true },
  { id: 'daily-rise', type: 'fund_rise', fundCode: 'all', threshold: 5, enabled: false },
  { id: 'rank-drop', type: 'rank_drop', fundCode: 'all', threshold: 70, enabled: false },
  { id: 'drawdown', type: 'drawdown', fundCode: 'all', threshold: 10, enabled: true }
]

export const DEFAULT_NOTIFICATION_TEMPLATES = {
  fund_drop: {
    title: '基金跌幅预警: {{fundName}}',
    content: '{{fundName}}({{fundCode}}) 当日跌幅 {{value}}%，超过预设阈值 {{threshold}}%。'
  },
  fund_rise: {
    title: '基金涨幅提醒: {{fundName}}',
    content: '{{fundName}}({{fundCode}}) 当日涨幅 {{value}}%，超过预设阈值 {{threshold}}%。'
  },
  rank_drop: {
    title: '排名下滑预警: {{fundName}}',
    content: '{{fundName}}({{fundCode}}) 当前排名分位 {{value}}%，超过预设阈值 {{threshold}}%。'
  },
  drawdown: {
    title: '回撤预警: {{fundName}}',
    content: '{{fundName}}({{fundCode}}) 最大回撤 {{value}}%，超过预设阈值 {{threshold}}%。'
  }
}

export function renderTemplate(template, context) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

export function buildAlert(rule, fund, payload, templates = DEFAULT_NOTIFICATION_TEMPLATES) {
  const template = {
    ...(templates[rule.type] || {}),
    ...(rule.template || {})
  }
  const context = {
    fundCode: fund.code,
    fundName: fund.name,
    ruleType: rule.type,
    threshold: payload.threshold,
    value: payload.value
  }

  return {
    type: rule.type,
    title: renderTemplate(template.title, context),
    content: renderTemplate(template.content, context),
    level: payload.level,
    fund: fund.code,
    value: payload.rawValue ?? payload.value,
    threshold: payload.rawThreshold ?? payload.threshold
  }
}

// 邮件配置（需要用户配置）
let emailConfig = null
let emailTransporter = null

/**
 * 配置邮件服务
 */
export function configureEmail(config) {
  emailConfig = config
  emailTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    }
  })
}

/**
 * 发送邮件通知
 */
export async function sendEmail(to, subject, content) {
  if (!emailTransporter) {
    console.warn('邮件服务未配置')
    return { success: false, error: '邮件服务未配置' }
  }

  try {
    await emailTransporter.sendMail({
      from: emailConfig.user,
      to,
      subject,
      html: content
    })
    return { success: true }
  } catch (error) {
    console.error('发送邮件失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 发送企业微信通知
 */
export async function sendWeChatWebhook(webhookUrl, content) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content }
      })
    })

    const data = await response.json()
    return { success: data.errcode === 0 }
  } catch (error) {
    console.error('发送企业微信通知失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 发送钉钉通知
 */
export async function sendDingtalkWebhook(webhookUrl, content) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content }
      })
    })

    const data = await response.json()
    return { success: data.errcode === 0 }
  } catch (error) {
    console.error('发送钉钉通知失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 发送 Server酱通知
 */
export async function sendServerChan(sendKey, title, content) {
  try {
    const url = `https://sctapi.ftqq.com/${sendKey}.send`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, desp: content })
    })

    const data = await response.json()
    return { success: data.code === 0 }
  } catch (error) {
    console.error('发送Server酱通知失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 发送 Telegram 通知
 */
export async function sendTelegram(botToken, chatId, content) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: content,
        parse_mode: 'HTML'
      })
    })

    const data = await response.json()
    return { success: data.ok }
  } catch (error) {
    console.error('发送Telegram通知失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 通知管理器
 */
class NotificationManager {
  constructor() {
    this.channels = new Map()
    this.history = []
    this.maxHistory = 1000
  }

  /**
   * 注册通知渠道
   */
  registerChannel(id, config) {
    this.channels.set(id, config)
  }

  /**
   * 移除通知渠道
   */
  removeChannel(id) {
    this.channels.delete(id)
  }

  /**
   * 获取所有渠道
   */
  getChannels() {
    return Array.from(this.channels.entries()).map(([id, config]) => ({
      id,
      ...config
    }))
  }

  /**
   * 发送通知
   */
  async send(alert) {
    const results = []

    for (const [id, channel] of this.channels.entries()) {
      if (!channel.enabled) continue

      let result

      switch (channel.type) {
        case 'email':
          result = await sendEmail(channel.to, alert.title, alert.content)
          break

        case 'wechat':
          result = await sendWeChatWebhook(channel.webhookUrl, alert.content)
          break

        case 'dingtalk':
          result = await sendDingtalkWebhook(channel.webhookUrl, alert.content)
          break

        case 'serverchan':
          result = await sendServerChan(channel.sendKey, alert.title, alert.content)
          break

        case 'telegram':
          result = await sendTelegram(channel.botToken, channel.chatId, alert.content)
          break

        default:
          result = { success: false, error: '未知通知类型' }
      }

      results.push({
        channel: id,
        type: channel.type,
        ...result
      })
    }

    // 记录历史
    this.history.unshift({
      timestamp: new Date().toISOString(),
      alert,
      results
    })

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory)
    }

    return results
  }

  /**
   * 获取通知历史
   */
  getHistory(limit = 50) {
    return this.history.slice(0, limit)
  }
}

// 创建通知管理器实例
export const notificationManager = new NotificationManager()

/**
 * 预警检查器
 */
export class AlertChecker {
  constructor(fundData, rules = DEFAULT_ALERT_RULES, options = {}) {
    this.fundData = fundData
    this.rules = rules
    this.templates = options.templates || DEFAULT_NOTIFICATION_TEMPLATES
  }

  /**
   * 检查所有规则
   */
  checkAll() {
    const alerts = []

    for (const rule of this.rules) {
      if (!rule.enabled) continue

      const alert = this.checkRule(rule)
      if (alert) {
        alerts.push(alert)
      }
    }

    return alerts
  }

  /**
   * 检查单条规则
   */
  checkRule(rule) {
    switch (rule.type) {
      case 'fund_drop':
        return this.checkFundDrop(rule)
      case 'fund_rise':
        return this.checkFundRise(rule)
      case 'pe_high':
        return this.checkPEHigh(rule)
      case 'rank_drop':
        return this.checkRankDrop(rule)
      case 'drawdown':
        return this.checkDrawdown(rule)
      default:
        return null
    }
  }

  /**
   * 检查基金跌幅
   */
  checkFundDrop(rule) {
    const funds = rule.fundCode === 'all'
      ? this.fundData
      : this.fundData.filter(f => f.code === rule.fundCode)

    for (const fund of funds) {
      if (fund.dayChange && fund.dayChange < -rule.threshold) {
        return {
          ...buildAlert(rule, fund, {
            level: 'warning',
            value: Math.abs(fund.dayChange).toFixed(2),
            threshold: rule.threshold,
            rawValue: fund.dayChange,
            rawThreshold: -rule.threshold
          }, this.templates)
        }
      }
    }

    return null
  }

  /**
   * 检查基金涨幅
   */
  checkFundRise(rule) {
    const funds = rule.fundCode === 'all'
      ? this.fundData
      : this.fundData.filter(f => f.code === rule.fundCode)

    for (const fund of funds) {
      if (fund.dayChange && fund.dayChange > rule.threshold) {
        return {
          ...buildAlert(rule, fund, {
            level: 'info',
            value: fund.dayChange.toFixed(2),
            threshold: rule.threshold,
            rawValue: fund.dayChange,
            rawThreshold: rule.threshold
          }, this.templates)
        }
      }
    }

    return null
  }

  /**
   * 检查 PE 高位
   */
  checkPEHigh(rule) {
    // 需要持仓数据
    return null
  }

  /**
   * 检查排名下滑
   */
  checkRankDrop(rule) {
    const funds = rule.fundCode === 'all'
      ? this.fundData
      : this.fundData.filter(f => f.code === rule.fundCode)

    for (const fund of funds) {
      if (fund.rank && fund.rankTotal) {
        const percentile = (fund.rank / fund.rankTotal) * 100
        if (percentile > rule.threshold) {
          return {
            ...buildAlert(rule, fund, {
              level: 'warning',
              value: percentile.toFixed(2),
              threshold: rule.threshold,
              rawValue: percentile,
              rawThreshold: rule.threshold
            }, this.templates)
          }
        }
      }
    }

    return null
  }

  /**
   * 检查回撤
   */
  checkDrawdown(rule) {
    const funds = rule.fundCode === 'all'
      ? this.fundData
      : this.fundData.filter(f => f.code === rule.fundCode)

    for (const fund of funds) {
      if (fund.maxDrawdown && Math.abs(fund.maxDrawdown) > rule.threshold) {
        return {
          ...buildAlert(rule, fund, {
            level: 'danger',
            value: Math.abs(fund.maxDrawdown).toFixed(2),
            threshold: rule.threshold,
            rawValue: fund.maxDrawdown,
            rawThreshold: -rule.threshold
          }, this.templates)
        }
      }
    }

    return null
  }
}

export default NotificationManager
