import { describe, expect, it } from 'vitest'
import { buildDiscScoreResult } from './discScoring'

describe('buildDiscScoreResult', () => {
  it('returns all trait scores in stable display order and normalizes against the leading score', () => {
    const result = buildDiscScoreResult({
      answers: [{ trait: 'D' }, { trait: 'D' }, { trait: 'D' }, { trait: 'I' }, { trait: 'S' }],
    })

    expect(result.profile.primaryTrait).toBe('D')
    expect(result.profile.secondaryTrait).toBe('I')
    expect(result.profile.scores).toEqual([
      { trait: 'D', score: 3, percentage: 100 },
      { trait: 'I', score: 1, percentage: 33 },
      { trait: 'S', score: 1, percentage: 33 },
      { trait: 'C', score: 0, percentage: 0 },
    ])
  })

  it('uses trait order as a deterministic tie-breaker', () => {
    const result = buildDiscScoreResult({ answers: [{ trait: 'I' }, { trait: 'D' }, { trait: 'S' }, { trait: 'C' }] })

    expect(result.profile.primaryTrait).toBe('D')
    expect(result.profile.secondaryTrait).toBe('I')
  })

  it('rejects empty and malformed assessments', () => {
    expect(() => buildDiscScoreResult({ answers: [] })).toThrow('At least one answer is required.')
    expect(() => buildDiscScoreResult({ answers: [{ trait: 'X' as 'D' }] })).toThrow('Some answers are invalid.')
  })
})
