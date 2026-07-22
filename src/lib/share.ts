import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { TraitKey } from '../types/disc'

export type SharePayload = {
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  url?: string
  referralCode?: string
}

export type SignatureStyle = {
  badge: string
  headline: string
  summary: string
}

const signatureStyles: Record<TraitKey, Record<TraitKey, SignatureStyle>> = {
  D: {
    D: { badge: 'The Decisive Driver', headline: 'Bold execution with a clear point of view.', summary: 'A leadership style built on momentum, clarity, and action.' },
    I: { badge: 'The Charismatic Builder', headline: 'Momentum fueled by people and vision.', summary: 'A leadership style that creates energy and participation.' },
    S: { badge: 'The Steady Anchor', headline: 'Calm leadership that steadies the room.', summary: 'A leadership style grounded in trust, support, and patience.' },
    C: { badge: 'The Analytical Leader', headline: 'Precision-led leadership with structure and rigor.', summary: 'A leadership style defined by insight, standards, and discipline.' },
  },
  I: {
    D: { badge: 'The Visionary Connector', headline: 'Ideas become movement through people and momentum.', summary: 'A leadership style that blends inspiration with action.' },
    I: { badge: 'The Magnetic Catalyst', headline: 'Energy and optimism that spark collective momentum.', summary: 'A leadership style built on warmth and influence.' },
    S: { badge: 'The Trusted Facilitator', headline: 'A calm, encouraging presence that helps others thrive.', summary: 'A leadership style that balances connection with steadiness.' },
    C: { badge: 'The Insightful Storyteller', headline: 'Big ideas framed with clarity and depth.', summary: 'A leadership style that resonates through thoughtful expression.' },
  },
  S: {
    D: { badge: 'The Grounded Operator', headline: 'Reliable leadership that keeps momentum sustainable.', summary: 'A leadership style that balances action with care.' },
    I: { badge: 'The Diplomatic Guide', headline: 'Supportive leadership that keeps people aligned.', summary: 'A leadership style rooted in empathy and connection.' },
    S: { badge: 'The Quiet Stabilizer', headline: 'Steady leadership that makes teams feel safe.', summary: 'A leadership style anchored in patience and trust.' },
    C: { badge: 'The Methodical Steward', headline: 'High standards with calm, deliberate execution.', summary: 'A leadership style grounded in rigor and reliability.' },
  },
  C: {
    D: { badge: 'The Strategic Executor', headline: 'Discipline guiding decisive action.', summary: 'A leadership style where precision supports momentum.' },
    I: { badge: 'The Thoughtful Influence', headline: 'Insightful leadership that shapes how ideas land.', summary: 'A leadership style that blends nuance with connection.' },
    S: { badge: 'The Calm Architect', headline: 'Structure and steadiness creating trust.', summary: 'A leadership style defined by care and consistency.' },
    C: { badge: 'The Precision Architect', headline: 'A refined leadership style built on quality and detail.', summary: 'A leadership style rooted in excellence and order.' },
  },
}

export function getSignatureLeadershipStyle(primaryTrait: TraitKey, secondaryTrait: TraitKey): SignatureStyle {
  return signatureStyles[primaryTrait]?.[secondaryTrait] ?? signatureStyles[primaryTrait]?.[primaryTrait] ?? signatureStyles.D.D
}

export function buildShareText({ primaryTrait, secondaryTrait, url = 'https://disc-wellness.app', referralCode }: SharePayload) {
  const signature = getSignatureLeadershipStyle(primaryTrait, secondaryTrait)
  const shareUrl = buildShareUrl('linkedin', url, referralCode)
  return `I just completed the Northstar DISC Assessment and discovered my behavioral style is “${signature.badge}” (${primaryTrait}${secondaryTrait}). Find your direction here: ${shareUrl}`
}

export function buildShareUrl(platform: 'linkedin' | 'twitter', url: string, referralCode?: string) {
  const baseUrl = new URL(url)
  if (referralCode) {
    baseUrl.searchParams.set('ref', referralCode)
  }

  if (platform === 'linkedin') {
    return baseUrl.toString()
  }

  return baseUrl.toString()
}

export type ShareEvent = {
  platform: 'linkedin' | 'twitter'
  referralCode?: string
  profileSignature?: string
  timestamp: string
}

export type ShareAnalytics = {
  total: number
  latest?: ShareEvent
  events: ShareEvent[]
}

function readShareAnalytics(): ShareAnalytics {
  if (typeof window === 'undefined') {
    return { total: 0, events: [] }
  }

  const saved = window.localStorage.getItem('disc-wellness.share-analytics')
  if (!saved) {
    return { total: 0, events: [] }
  }

  try {
    return JSON.parse(saved) as ShareAnalytics
  } catch {
    return { total: 0, events: [] }
  }
}

export function trackShareEvent({ platform, referralCode, profileSignature }: { platform: 'linkedin' | 'twitter'; referralCode?: string; profileSignature?: string }) {
  const analytics = readShareAnalytics()
  const event: ShareEvent = {
    platform,
    referralCode,
    profileSignature,
    timestamp: new Date().toISOString(),
  }

  const next = {
    total: analytics.total + 1,
    latest: event,
    events: [...analytics.events, event],
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('disc-wellness.share-analytics', JSON.stringify(next))
  }
  return next
}

export function getShareAnalytics() {
  return readShareAnalytics()
}

export function buildOgImageUrl(profileSignature: string, referralCode?: string) {
  const baseUrl = 'https://disc-wellness.app/og-image.svg'
  const url = new URL(baseUrl)
  url.searchParams.set('signature', encodeURIComponent(profileSignature))
  if (referralCode) {
    url.searchParams.set('ref', referralCode)
  }
  return url.toString()
}

export async function exportShareCard(
  element: HTMLElement,
  options?: {
    fileName?: string
    format?: 'png' | 'pdf'
    profile?: { primaryTrait?: TraitKey; secondaryTrait?: TraitKey } | null
    primaryTrait?: TraitKey
    secondaryTrait?: TraitKey
    completionScore?: number
    generatedAt?: string
  },
) {
  const format = options?.format ?? 'png'
  const fileName = options?.fileName ?? 'northstar-disc-share-card'

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { ok: false, error: 'Exports are only available in the browser' }
  }

  if (format === 'pdf') {
    try {
      const canvas = await renderCanvasForExport(element)
      const dataUrl = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'pt', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 36
      const maxWidth = pageWidth - margin * 2
      const maxHeight = pageHeight - margin * 2

      const canvasWidth = canvas.width || element.scrollWidth || element.clientWidth || 900
      const canvasHeight = canvas.height || element.scrollHeight || element.clientHeight || 1400
      const ratio = canvasHeight / Math.max(1, canvasWidth)
      const renderedWidth = maxWidth
      const renderedHeight = renderedWidth * ratio
      const totalPages = Math.max(1, Math.ceil(renderedHeight / maxHeight))

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        if (pageIndex > 0) {
          pdf.addPage()
        }

        const yOffset = pageIndex * maxHeight
        pdf.addImage(dataUrl, 'PNG', margin, margin - yOffset, renderedWidth, renderedHeight)
      }

      const blob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${fileName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)

      return { ok: true, fileName: `${fileName}.pdf` }
    } catch {
      return { ok: false, error: 'Unable to generate the executive PDF export.' }
    }
  }

  const dataUrl = await exportAsImageDataUrl(element)
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${fileName}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return { ok: true, fileName: `${fileName}.png` }
}

async function renderCanvasForExport(element: HTMLElement) {
  return html2canvas(element, {
    backgroundColor: '#fffaf4',
    scale: 3,
    logging: false,
    useCORS: true,
    allowTaint: true,
    width: element.scrollWidth || element.clientWidth || 1200,
    height: element.scrollHeight || element.clientHeight || 1600,
    onclone(documentClone) {
      const style = documentClone.createElement('style')
      style.textContent = `
        body { background: #fffaf4 !important; }
        .executive-report, .executive-report * { box-shadow: none !important; }
        .executive-report { transform: none !important; }
      `
      documentClone.head.appendChild(style)
    },
  })
}

async function exportAsImageDataUrl(element: HTMLElement) {
  try {
    const canvas = await renderCanvasForExport(element)
    return canvas.toDataURL('image/png')
  } catch {
    return buildFallbackExportDataUrl(element)
  }
}

function buildFallbackExportDataUrl(element: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1600
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Unable to create export canvas')
  }

  const width = canvas.width
  const height = canvas.height
  const padding = 72
  const radius = 32
  const summary = element.innerText.replace(/\s+/g, ' ').trim().slice(0, 620)

  ctx.fillStyle = '#fffaf4'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#e7ddd0'
  ctx.lineWidth = 3
  roundRect(ctx, padding, padding, width - padding * 2, height - padding * 2, radius)
  ctx.fillStyle = '#fffdf9'
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#c78e69'
  roundRect(ctx, padding + 28, padding + 28, width - padding * 2 - 56, 220, 24)
  ctx.fill()

  ctx.fillStyle = '#2f241d'
  ctx.font = '700 44px Arial'
  ctx.fillText('Northstar DISC', padding + 52, padding + 96)
  ctx.font = '600 24px Arial'
  ctx.fillStyle = '#8b735d'
  ctx.fillText('Leadership Signature • Share Ready', padding + 52, padding + 136)

  ctx.fillStyle = '#4d3b30'
  ctx.font = '700 30px Arial'
  ctx.fillText('Executive Profile Snapshot', padding + 52, padding + 314)

  ctx.fillStyle = '#f7efe6'
  roundRect(ctx, padding + 44, padding + 350, width - padding * 2 - 88, 220, 22)
  ctx.fill()
  ctx.fillStyle = '#4d3b30'
  ctx.font = '700 24px Arial'
  ctx.fillText('Core Narrative', padding + 72, padding + 392)
  ctx.fillStyle = '#6e5a4f'
  ctx.font = '22px Arial'
  wrapText(ctx, summary, padding + 72, padding + 430, width - padding * 2 - 144, 30)

  ctx.fillStyle = '#f2e0cf'
  roundRect(ctx, padding + 44, height - 240, width - padding * 2 - 88, 130, 22)
  ctx.fill()

  ctx.fillStyle = '#4d3b30'
  ctx.font = '600 24px Arial'
  ctx.fillText('Why it stands out', padding + 72, height - 190)
  ctx.font = '20px Arial'
  ctx.fillStyle = '#6e5a4f'
  ctx.fillText('Premium layout • Stronger storytelling • Ready for LinkedIn and PDF', padding + 72, height - 150)

  return canvas.toDataURL('image/png')
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY)
      line = word
      currentY += lineHeight
    } else {
      line = testLine
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY)
  }
}
