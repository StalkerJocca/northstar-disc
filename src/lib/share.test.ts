import { afterEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildExportLayoutSections, buildShareText, buildShareUrl, exportShareCard, getSignatureLeadershipStyle, trackShareEvent } from './share'

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,abc123',
  }),
}))

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      addPage: vi.fn().mockReturnValue({
        getSize: () => ({ width: 595.28, height: 841.89 }),
        drawImage: vi.fn(),
        drawText: vi.fn(),
        drawRectangle: vi.fn(),
      }),
      embedPng: vi.fn().mockResolvedValue({
        width: 1200,
        height: 800,
      }),
      embedFont: vi.fn().mockResolvedValue({
        widthOfTextAtSize: vi.fn(() => 100),
      }),
      save: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45])),
    }),
  },
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

  it('builds a compact export layout from the report sections', () => {
    const element = document.createElement('div')
    const header = document.createElement('section')
    header.setAttribute('data-export-section', 'header')
    header.textContent = 'Executive overview'

    const profile = document.createElement('section')
    profile.setAttribute('data-export-section', 'profile-overview')
    profile.textContent = 'Trait breakdown and radar chart'

    const footer = document.createElement('section')
    footer.setAttribute('data-export-section', 'footer')
    footer.textContent = 'Footer'

    element.append(header, profile, footer)

    const layout = buildExportLayoutSections(element)

    expect(layout.map((item) => item.id)).toEqual(['header', 'profile-overview', 'footer'])
    expect(layout[0].title).toContain('Executive')
    expect(layout[1].title).toContain('Profile')
    expect(layout[2].title).toContain('Closing')
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
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    const originalToBlob = HTMLCanvasElement.prototype.toBlob

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
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
        arc: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D),
    })

    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
    })

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
    expect(PDFDocument.create).toHaveBeenCalled()

    appendSpy.mockRestore()
    removeSpy.mockRestore()
    openSpy.mockRestore()

    if (originalGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: originalGetContext,
      })
    }

    if (originalToBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        configurable: true,
        value: originalToBlob,
      })
    }
  })

  it('creates a PDF document for a long report export', async () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    const originalToBlob = HTMLCanvasElement.prototype.toBlob

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
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
        arc: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D),
    })

    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
    })

    const element = document.createElement('div')
    element.innerText = 'Long executive report content'

    await exportShareCard(element, { fileName: 'executive-report', format: 'pdf' })

    expect(PDFDocument.create).toHaveBeenCalled()

    if (originalGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: originalGetContext,
      })
    }

    if (originalToBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        configurable: true,
        value: originalToBlob,
      })
    }
  })

  it('spans multiple PDF pages for long executive exports', async () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    const originalToBlob = HTMLCanvasElement.prototype.toBlob

    const pageMock = {
      getSize: () => ({ width: 595.28, height: 841.89 }),
      drawImage: vi.fn(),
    }

    const addPageSpy = vi.fn().mockReturnValue(pageMock)

    vi.mocked(PDFDocument.create).mockResolvedValueOnce({
      addPage: addPageSpy,
      embedPng: vi.fn().mockResolvedValue({ width: 1200, height: 2200 }),
      save: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45])),
    } as never)

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
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
        arc: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D),
    })

    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
    })

    const element = document.createElement('div')
    element.innerText = 'Long executive report content'

    await exportShareCard(element, { fileName: 'multi-page-report', format: 'pdf' })

    expect(addPageSpy).toHaveBeenCalledTimes(1)

    if (originalGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: originalGetContext,
      })
    }

    if (originalToBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        configurable: true,
        value: originalToBlob,
      })
    }
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
