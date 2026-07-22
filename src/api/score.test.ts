import { describe, expect, it } from 'vitest'
import { POST } from './score'
import { buildDiscScoreResult } from '../lib/discScoring'

describe('server-side scoring', () => {
  it('returns a valid profile for well-formed answers', () => {
    const result = buildDiscScoreResult({ answers: [{ trait: 'D' }, { trait: 'I' }, { trait: 'S' }] })

    expect(result.success).toBe(true)
    expect(result.profile.primaryTrait).toBe('D')
    expect(result.profile.secondaryTrait).toBe('I')
  })

  it('rejects missing or invalid answers through the API handler', async () => {
    const response = await POST(new Request('http://localhost/api/score', {
      method: 'POST',
      body: JSON.stringify({ answers: [{ trait: 'X' }] }),
      headers: { 'content-type': 'application/json' },
    }))

    expect(response.status).toBe(400)
  })
})
