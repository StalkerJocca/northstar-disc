import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsPDF } from 'jspdf'
import { buildShareText, buildShareUrl, exportShareCard, getSignatureLeadershipStyle, trackShareEvent } from './share'

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,abc123',
  }),
}))

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 595,
        getHeight: () => 842,
      },
    },
    addImage: vi.fn(),
    output: vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' })),
  })),
}))

describe('share helpers', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

  it('downloads a PDF directly instead of opening a blank page', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 1200
      height = 800
      private _src = ''
      set src(value: string) {
        this._src = value
        if (this.onload) {
          this.onload()
        }
      }
      get src() {
        return this._src
      }
    }

    vi.stubGlobal('Image', MockImage)
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)

    const element = document.createElement('div')
    element.innerText = 'PDF download export'

    const result = await exportShareCard(element, { fileName: 'download', format: 'pdf' })

    expect(result.ok).toBe(true)
    expect(result.fileName).toBe('download.pdf')
    expect(openSpy).not.toHaveBeenCalled()
    expect(jsPDF).toHaveBeenCalled()

    appendSpy.mockRestore()
    removeSpy.mockRestore()
    openSpy.mockRestore()
  })

  it('falls back to a canvas-based export when html2canvas cannot render the card', async () => {
    const html2canvasModule = await import('html2canvas')
    const html2canvasMock = vi.mocked(html2canvasModule.default)
    html2canvasMock.mockRejectedValueOnce(new Error('unsupported color'))

    const element = document.createElement('div')
    element.innerText = 'Fallback export content'

    const originalGetContext = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn().mockReturnValue({
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
      } as unknown as CanvasRenderingContext2D),
    })

    const result = await exportShareCard(element, { fileName: 'fallback', format: 'png' })

    expect(result.ok).toBe(true)
    expect(result.fileName).toBe('fallback.png')

    if (originalGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: originalGetContext,
      })
    }
  })
})
