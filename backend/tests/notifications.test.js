import {
  AlertChecker,
  DEFAULT_ALERT_RULES,
  renderTemplate
} from '../notifications.js'

describe('notification templates and alert rules', () => {
  it('renders notification templates with context values', () => {
    const message = renderTemplate('{{fundName}}({{fundCode}}) crossed {{threshold}}%', {
      fundName: 'Test Fund',
      fundCode: '000001',
      threshold: 3
    })

    expect(message).toBe('Test Fund(000001) crossed 3%')
  })

  it('uses default rules when none are provided', () => {
    const checker = new AlertChecker([
      { code: '000001', name: 'Test Fund', dayChange: -4.2 }
    ])

    const alerts = checker.checkAll()

    expect(DEFAULT_ALERT_RULES.some(rule => rule.type === 'fund_drop')).toBe(true)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      type: 'fund_drop',
      fund: '000001',
      level: 'warning',
      threshold: -3
    })
  })

  it('allows per-rule custom notification templates', () => {
    const checker = new AlertChecker(
      [{ code: '000001', name: 'Test Fund', dayChange: 6.5 }],
      [{
        type: 'fund_rise',
        fundCode: 'all',
        threshold: 5,
        enabled: true,
        template: {
          title: 'Custom {{fundCode}}',
          content: '{{fundName}} value={{value}} threshold={{threshold}}'
        }
      }]
    )

    const alerts = checker.checkAll()

    expect(alerts[0].title).toBe('Custom 000001')
    expect(alerts[0].content).toBe('Test Fund value=6.50 threshold=5')
  })
})
