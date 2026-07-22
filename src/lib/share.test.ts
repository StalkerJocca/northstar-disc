import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildShareText, buildShareUrl, exportShareCard, getSignatureLeadershipStyle, trackShareEvent } from './share'

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,abc123',
  }),
}))

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

  it('exports the share card as a png', async () => {
    const anchor = document.createElement('a')
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => undefined)
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return anchor as unknown as HTMLElement
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', 'div') as unknown as HTMLElement
    })

    const element = document.createElement('div')
    const result = await exportShareCard(element, { fileName: 'preview', format: 'png' })

    expect(result.ok).toBe(true)
    expect(result.fileName).toBe('preview.png')
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
    appendSpy.mockRestore()
    removeSpy.mockRestore()
    vi.restoreAllMocks()
  })
})
