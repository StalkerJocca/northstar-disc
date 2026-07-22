import html2canvas from 'html2canvas'
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

export async function exportShareCard(element: HTMLElement, options?: { fileName?: string; format?: 'png' | 'pdf' }) {
  const format = options?.format ?? 'png'
  const fileName = options?.fileName ?? 'northstar-disc-share-card'

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { ok: false, error: 'Exports are only available in the browser' }
  }

  const dataUrl = await exportAsImageDataUrl(element)

  if (format === 'pdf') {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      return { ok: false, error: 'Unable to open print preview' }
    }

    printWindow.document.write(`<!doctype html><html><head><style>body{margin:0;padding:24px;background:#fff;font-family:Arial,sans-serif}img{width:100%;height:auto;border-radius:24px;box-shadow:0 12px 40px rgba(0,0,0,.15)}</style></head><body><img src="${dataUrl}" alt="Northstar DISC share card" /></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    return { ok: true, fileName: `${fileName}.pdf` }
  }

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${fileName}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return { ok: true, fileName: `${fileName}.png` }
}

async function exportAsImageDataUrl(element: HTMLElement) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#fffaf4',
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
    width: element.scrollWidth || element.clientWidth || 1200,
    height: element.scrollHeight || element.clientHeight || 1600,
  })

  return canvas.toDataURL('image/png')
}
