import { afterEach, describe, expect, it } from 'vitest'
import { buildShareText, buildShareUrl, getSignatureLeadershipStyle, trackShareEvent } from './share'

describe('share helpers', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('builds tailored share copy for a primary and secondary trait pair', () => {
    const text = buildShareText({
      primaryTrait: 'D',
      secondaryTrait: 'C',
      url: 'https://disc-wellness.app',
    })

    expect(text).toContain('Northstar DISC')
    expect(text).toContain('The Analytical Leader')
    expect(text).toContain('https://disc-wellness.app')
  })

  it('derives a signature style label for the profile', () => {
    expect(getSignatureLeadershipStyle('D', 'C').badge).toBe('The Analytical Leader')
    expect(getSignatureLeadershipStyle('I', 'D').badge).toBe('The Visionary Connector')
  })

  it('appends a referral code to outbound share links', () => {
    expect(buildShareUrl('linkedin', 'https://disc-wellness.app', 'abc123')).toContain('ref=abc123')
  })

  it('stores share events for referral analytics', () => {
    const metrics = trackShareEvent({ platform: 'linkedin', referralCode: 'abc123', profileSignature: 'The Analytical Leader' })

    expect(metrics.total).toBe(1)
    expect(metrics.latest?.platform).toBe('linkedin')
    expect(metrics.latest?.referralCode).toBe('abc123')
  })
})
