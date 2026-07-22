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
    element.innerText = 'Northstar DISC summary for export'
    const result = await exportShareCard(element, { fileName: 'preview', format: 'png' })

    expect(result.ok).toBe(true)
    expect(result.fileName).toBe('preview.png')
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
    appendSpy.mockRestore()
    removeSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('still opens a printable PDF view when popup windows are blocked', async () => {
    const originalOpen = window.open
    window.open = vi.fn(() => null)

    const element = document.createElement('div')
    element.innerText = 'Printable export content'

    const result = await exportShareCard(element, { fileName: 'blocked-popup', format: 'pdf' })

    expect(result.ok).toBe(true)
    expect(result.fileName).toBe('blocked-popup.pdf')

    window.open = originalOpen
  })

  it('falls back to a canvas-based export when html2canvas cannot render the card', async () => {
    const html2canvasModule = await import('html2canvas')
    const html2canvasMock = vi.mocked(html2canvasModule.default)
    html2canvasMock.mockRejectedValueOnce(new Error('unsupported color'))

    const element = document.createElement('div')
    element.innerText = 'Fallback export content'

    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      lineWidth: 1,
      strokeStyle: '',
    } as unknown as CanvasRenderingContext2D)

    const result = await exportShareCard(element, { fileName: 'fallback', format: 'png' })

    expect(result.ok).toBe(true)
    expect(result.fileName).toBe('fallback.png')

    HTMLCanvasElement.prototype.getContext = originalGetContext
  })
})
