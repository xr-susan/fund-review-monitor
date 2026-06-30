import { requestFirstAvailable } from '../services/fundApi.js'

describe('requestFirstAvailable', () => {
  it('returns the first valid provider result', async () => {
    const result = await requestFirstAvailable([
      { name: 'primary', fetch: async () => null },
      { name: 'secondary', fetch: async () => ({ ok: true }) }
    ], {
      logger: { warn: jest.fn() }
    })

    expect(result.provider).toBe('secondary')
    expect(result.data).toEqual({ ok: true })
    expect(result.errors).toEqual([{ provider: 'primary', error: 'empty response' }])
  })

  it('continues after provider errors and returns the default value', async () => {
    const logger = { warn: jest.fn() }
    const result = await requestFirstAvailable([
      { name: 'primary', fetch: async () => { throw new Error('timeout') } },
      { name: 'secondary', fetch: async () => [] }
    ], {
      defaultValue: [],
      isValid: value => Array.isArray(value) && value.length > 0,
      logger
    })

    expect(result.provider).toBeNull()
    expect(result.data).toEqual([])
    expect(result.errors).toEqual([
      { provider: 'primary', error: 'timeout' },
      { provider: 'secondary', error: 'empty response' }
    ])
    expect(logger.warn).toHaveBeenCalledWith('Data provider failed: primary', 'timeout')
  })
})
