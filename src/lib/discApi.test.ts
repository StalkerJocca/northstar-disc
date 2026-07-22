import { describe, expect, it, vi } from 'vitest'
import { submitDiscScore } from './discApi'

describe('submitDiscScore', () => {
  it('falls back to local scoring when the API request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down')
    }))

    const result = await submitDiscScore({ answers: [{ trait: 'D' }, { trait: 'I' }, { trait: 'S' }] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.profile.primaryTrait).toBe('D')
    }
    vi.unstubAllGlobals()
  })
})
