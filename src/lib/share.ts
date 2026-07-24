import html2canvas from 'html2canvas'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { DiscScoreResponse, TraitKey } from '../types/disc'
import { traitMeta } from './discProfile'

export type SharePayload = {
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  url?: string
  referralCode?: string
  copyTemplate?: string
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

export function buildShareText({ primaryTrait, secondaryTrait, url = 'https://disc-wellness.app', referralCode, copyTemplate }: SharePayload) {
  const signature = getSignatureLeadershipStyle(primaryTrait, secondaryTrait)
  const shareUrl = buildShareUrl('linkedin', url, referralCode)
  if (copyTemplate) {
    return copyTemplate
  }

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

async function buildPdfReportPdfBytes(
  element: HTMLElement,
  options?: {
    profile?: DiscScoreResponse['profile'] | null
    primaryTrait?: TraitKey
    secondaryTrait?: TraitKey
    completionScore?: number
    generatedAt?: string
  },
) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 40
  const primaryTrait = options?.primaryTrait ?? options?.profile?.primaryTrait ?? 'D'
  const secondaryTrait = options?.secondaryTrait ?? options?.profile?.secondaryTrait ?? 'C'
  const primaryMeta = traitMeta[primaryTrait]
  const secondaryMeta = traitMeta[secondaryTrait]
  const signatureStyle = getSignatureLeadershipStyle(primaryTrait, secondaryTrait)
  const summary = options?.profile?.narrative ?? collectSectionSummary(element)
  const sections = collectPdfReportSections(element)

  addPdfCoverPage(pdfDoc, font, boldFont, pageWidth, pageHeight, margin, {
    title: 'Executive Behavioral Report',
    subtitle: '',
    generatedAt: options?.generatedAt ?? '',
    completionScore: options?.completionScore ?? 0,
    profile: options?.profile,
    primaryMeta,
    secondaryMeta,
    summary,
    signatureStyle,
  })

  addPdfDetailPages(pdfDoc, font, boldFont, pageWidth, pageHeight, margin, sections)
  return pdfDoc.save()
}

function collectSectionSummary(element: HTMLElement) {
  const firstHeading = element.querySelector<HTMLElement>('h1, h2, h3, h4')
  if (firstHeading?.textContent?.trim()) {
    return cleanText(firstHeading.textContent)
  }

  return cleanText(element.innerText).slice(0, 420)
}

type PdfReportChip = {
  label: string
  value: string
}

type PdfTraitSummary = {
  label: string
  percentage: number
  score?: number
}

type PdfReportSection = {
  id: string
  title: string
  text: string
  bullets: string[]
  accent: string
  badge?: string
  chips?: PdfReportChip[]
  traits?: PdfTraitSummary[]
}

function collectPdfReportSections(element: HTMLElement): PdfReportSection[] {
  const sections = Array.from(element.querySelectorAll<HTMLElement>('[data-export-section]')).map((section) => {
    const id = section.getAttribute('data-export-section') ?? 'section'
    const title = section.querySelector<HTMLElement>('h1, h2, h3, h4')?.textContent?.trim() ?? getSectionTitle(id)
    const bullets = Array.from(section.querySelectorAll('li')).map((item) => cleanText(item.textContent))
    const rawText = cleanText(section.innerText.replace(title, ''))

    let sectionText = rawText
    if (id === 'header') {
      const heading = section.querySelector<HTMLElement>('h1, h2, h3, h4')
      const summaryElement = heading?.nextElementSibling instanceof HTMLElement ? heading.nextElementSibling : null
      if (summaryElement?.textContent?.trim()) {
        sectionText = cleanText(summaryElement.textContent)
      } else {
        sectionText = rawText.split(/Completion date:/i)[0].trim()
        const splitByTitle = sectionText.split(/Executive Behavioral Report/i)
        if (splitByTitle.length > 1) {
          sectionText = splitByTitle[1].trim()
        }
      }
    }

    if (id === 'profile-overview') {
      const sectionChildren = Array.from(section.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
      if (sectionChildren.length > 1) {
        const rightColumnText = cleanText(sectionChildren[1].textContent ?? '')
        const interpretationMatch = rightColumnText.match(/Interpretation:\s*(.+)/i)
        sectionText = interpretationMatch ? interpretationMatch[1].trim() : rightColumnText.replace(/^Profile Radar Chart\s*/i, '').trim()
      }
    }

    const baselineText = bullets.length ? sectionText.replace(bullets.join(' '), '').trim() : sectionText
    return {
      id,
      title,
      text: baselineText,
      bullets,
      accent: getSectionAccent(id),
      badge: getSectionBadgeLabel(id),
      chips: id === 'header' ? extractSectionChips(rawText) : undefined,
      traits: id === 'profile-overview' ? parseProfileTraits(rawText) : undefined,
    }
  })

  if (sections.length > 0) {
    return sections
  }

  return [{
    id: 'report',
    title: 'Executive Report',
    text: cleanText(element.innerText),
    bullets: [],
    accent: '#8b5e3c',
  }]
}

function addPdfCoverPage(
  pdfDoc: Awaited<ReturnType<typeof PDFDocument.create>>,
  font: any,
  boldFont: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  data: {
    title: string
    subtitle: string
    generatedAt: string
    completionScore: number
    profile?: DiscScoreResponse['profile'] | null
    primaryMeta: { label: string }
    secondaryMeta: { label: string }
    summary: string
    signatureStyle: SignatureStyle
  },
) {
  const page = pdfDoc.addPage([pageWidth, pageHeight])
  const background = rgb(0.995, 0.99, 0.98)
  const headerPanel = rgb(0.948, 0.922, 0.892)
  const cardSurface = rgb(0.99, 0.98, 0.95)
  const accent = rgb(0.72, 0.51, 0.32)
  const textDark = rgb(0.18, 0.11, 0.07)
  const textWarm = rgb(0.36, 0.28, 0.21)

  // Executive Behavioral Report Settings
  page.drawRectangle({ x: margin, y: margin, width: pageWidth - margin * 2, height: pageHeight - margin * 2, color: background })

  const headerTop = pageHeight - margin
  const headerHeight = 150
  page.drawRectangle({ x: margin + 10, y: headerTop - headerHeight, width: pageWidth - margin * 2 - 20, height: headerHeight, color: headerPanel })
  page.drawRectangle({ x: margin + 24, y: headerTop - 5, width: 465, height: 6, color: accent })
  page.drawRectangle({ x: margin + 24, y: headerTop - 85, width: 275, height: 4, color: rgb(0.48, 0.34, 0.22) })
  page.drawText('Northstar DISC', { x: margin + 26, y: headerTop - 44, size: 26, font: boldFont, color: textDark })
  page.drawText(data.title, { x: margin + 26, y: headerTop - 74, size: 20, font: boldFont, color: textDark })
  page.drawText(data.subtitle, { x: margin + 26, y: headerTop - 100, size: 11, font: font, color: textWarm })
  page.drawText(`Completion: ${data.completionScore}%`, { x: margin + 26, y: headerTop - 118, size: 10,  font: boldFont, color: textWarm })
  page.drawText(`Generated: ${data.generatedAt}`, { x: margin + 330, y: headerTop - 118, size: 10, font: font, color: textWarm })
  page.drawText(`Primary: ${data.primaryMeta.label}`, { x: margin + 26, y: headerTop - 136, size: 10, font: boldFont, color: textWarm })
  page.drawText(`Secondary: ${data.secondaryMeta.label}`, { x: margin + 330, y: headerTop - 136, size: 10, font: boldFont, color: textWarm })

  const leftColumnX = margin + 24
  const leftColumnWidth = pageWidth - margin * 2 - 280
  const rightColumnX = pageWidth - margin - 240
  const summaryTop = headerTop - headerHeight - 22
  const summaryWidth = leftColumnWidth

  const summaryLines = splitPdfText(data.summary, summaryWidth - 20, font, 11)
  const summaryLineHeight = 14
  const summaryHeight = Math.max(120, summaryLines.length * summaryLineHeight + 48)

  page.drawRectangle({ x: leftColumnX - 14, y: summaryTop - summaryHeight, width: summaryWidth + 28, height: summaryHeight, color: cardSurface })
  // accent row at the top of the summary card
  page.drawRectangle({ x: leftColumnX - 14, y: summaryTop - 6, width: summaryWidth + 28, height: 6, color: accent })
  page.drawText('Executive summary', { x: leftColumnX, y: summaryTop - 24, size: 14, font: boldFont, color: textDark })

  let cursorY = summaryTop - 44
  summaryLines.forEach((line) => {
    page.drawText(line, { x: leftColumnX, y: cursorY, size: 10, font: font, color: textWarm })
    cursorY -= 14
  })
  const profileBadgeTop = summaryTop - 24
  drawProfileBadge(page, rightColumnX, profileBadgeTop, 232, data.signatureStyle.badge, font)

  // Signature badge: position below the profile badge
  const signatureTop = profileBadgeTop - 128
  drawSignatureBadge(page, rightColumnX, signatureTop, 232, `${data.primaryMeta.label} • ${data.secondaryMeta.label}`, data.summary, font, boldFont)

  // Profile overview card sits beneath the signature badge
  const profileOverviewTop = signatureTop - 132

  // Trait chips sit below the profile overview
  const traitChipY = profileOverviewTop - 16
  drawTraitChip(page, rightColumnX, traitChipY + 155, 'Primary Trait:', data.primaryMeta.label, font, boldFont)
  drawTraitChip(page, rightColumnX, traitChipY + 120, 'Secondary Trait:', data.secondaryMeta.label, font, boldFont)

  // Move Leadership fingerprint to the left column below the Executive summary
  const chartTop = summaryTop - summaryHeight - 10
  const chartHeight = 240
  page.drawRectangle({ x: leftColumnX - 14, y: chartTop - chartHeight, width: summaryWidth + 28, height: chartHeight, color: cardSurface })
  page.drawRectangle({ x: leftColumnX - 14, y: chartTop - 6, width: summaryWidth + 28, height: 6, color: accent })
  page.drawText('Leadership fingerprint', { x: leftColumnX, y: chartTop - 24, size: 14, font: boldFont, color: textDark })
  page.drawText('Radar and score profile', { x: leftColumnX, y: chartTop - 40, size: 10, font: font, color: textWarm })

  // RADAR SETTINGS and SIZE
  const traitScores = data.profile?.scores ?? []
  drawTraitPerformanceChart(page, leftColumnX + 16, chartTop - 50, 200, traitScores, font, boldFont)
 
}

// Executive summary

function drawProfileBadge(page: any, x: number, y: number, width: number, badge: string, font: any) {
  const height = 200
  page.drawRectangle({ x, y: y - height + 24, width, height, color: rgb(0.98, 0.95, 0.90) })
  // LINE AT THE TOP OF THE BADGE
  page.drawRectangle({ x, y: y + 18, width, height: 6, color: rgb(0.73, 0.53, 0.34) })
  // BADGE CONTENT
  page.drawText(badge, { x: x + 14, y: y - 85, size: 10, font, color: rgb(0.38, 0.27, 0.19) })
}

function drawSignatureBadge(page: any, x: number, y: number, width: number, title: string, description: string, font: any, boldFont: any) {
  const badgeHeight = 118
  page.drawRectangle({ x, y: y - badgeHeight + 24, width, height: badgeHeight, color: rgb(0.98, 0.95, 0.90) })
  page.drawRectangle({ x, y: y + 16, width, height: 6, color: rgb(0.73, 0.53, 0.34) })
  page.drawText('Executive Signature', { x: x + 14, y: y + 130, size: 12, font: boldFont, color: rgb(0.45, 0.32, 0.22) })
  page.drawText(title, { x: x + 14, y: y + 30, size: 10, font: boldFont, color: rgb(0.38, 0.27, 0.19) })

  const descLines = splitPdfText(description, width - 32, font, 9)
  let descY = y + 110
  descLines.forEach((line) => {
    page.drawText(line, { x: x + 14, y: descY, size: 9, font: font, color: rgb(0.38, 0.27, 0.19) })
    descY -= 12
  })
}



function drawTraitPerformanceChart(page: any, x: number, y: number, width: number, scores: Array<{ trait: TraitKey; score: number; percentage: number }>, font: any, boldFont: any) {
  const radarSize = width
  const radius = radarSize / 2
  const centerX = x + radius
  const centerY = y - 20 - radius

  for (let ring = 1; ring <= 3; ring += 1) {
    page.drawEllipse({ x: centerX, y: centerY, xScale: (radius * ring) / 3, yScale: (radius * ring) / 3, color: rgb(0.91, 0.86, 0.79), opacity: 0.35 })
  }

  const axes = [
    { dx: 0, dy: radius },
    { dx: radius, dy: 0 },
    { dx: 0, dy: -radius },
    { dx: -radius, dy: 0 },
  ]
  axes.forEach((axis) => {
    page.drawLine({ start: { x: centerX, y: centerY }, end: { x: centerX + axis.dx, y: centerY + axis.dy }, thickness: 0.8, color: rgb(0.78, 0.70, 0.62) })
  })

  if (scores.length) {
    const polygonPath = buildRadarPath(scores, centerX, centerY, radius)
    page.drawSvgPath(polygonPath, { x: 0, y: 0, color: rgb(0.78, 0.49, 0.41), opacity: 0.35, borderColor: rgb(0.58, 0.33, 0.23), borderWidth: 1.2 })

    scores.forEach((item, index) => {
      const angle = (Math.PI * 2 * index) / scores.length - Math.PI / 2
      const pointRadius = radius * (item.percentage / 100)
      const px = centerX + Math.cos(angle) * pointRadius
      const py = centerY + Math.sin(angle) * pointRadius

      page.drawCircle({ x: px, y: py, size: 8, color: getTraitColor(item.trait) })
      page.drawText(item.trait, { x: centerX + Math.cos(angle) * (radius + 18) - 10, y: centerY + Math.sin(angle) * (radius + 18) - 5, size: 8, font: font, color: rgb(0.27, 0.18, 0.12) })
    })
  } else {
    page.drawText('Profile data unavailable for chart rendering.', { x: x + 8, y: y - 24, size: 8, font: font, color: rgb(0.45, 0.32, 0.22) })
  }

  const barLeft = x
  let barY = y - radarSize - 75
  const barMaxWidth = width
  const barSpacing = 22
  scores.forEach((item) => {
    const barWidth = Math.max(24, (barMaxWidth * item.percentage) / 100)
    page.drawRectangle({ x: barLeft, y: barY, width: barMaxWidth, height: 10, color: rgb(0.90, 0.84, 0.76) })
    page.drawRectangle({ x: barLeft, y: barY, width: barWidth, height: 10, color: getTraitColor(item.trait) })
    // Draw the trait label above the bar
    page.drawText(item.trait, { x: barLeft + 5, y: barY + 2, size: 8, font: boldFont, color: rgb(0.35, 0.25, 0.18) })
    // Draw the percentage value at the end of the bar, ensuring it doesn't overflow the bar's width
    page.drawText(`${item.percentage}%`, { x: barLeft + barMaxWidth - 22, y: barY + 2, size: 8, font: boldFont, color: rgb(0.27, 0.18, 0.12) })
    barY -= barSpacing
  })
}

function buildRadarPath(scores: Array<{ trait: TraitKey; score: number; percentage: number }>, cx: number, cy: number, radius: number) {
  const points = scores.map((item, index) => {
    const angle = (Math.PI * 2 * index) / scores.length - Math.PI / 2
    const distance = (item.percentage / 100) * radius
    const x = cx + Math.cos(angle) * distance
    const y = cy + Math.sin(angle) * distance
    return `${index === 0 ? 'M' : 'L'} ${x},${y}`
  })
  return `${points.join(' ')} Z`
}

function getTraitColor(trait: TraitKey) {
  switch (trait) {
    case 'D':
      return rgb(0.78, 0.49, 0.41)
    case 'I':
      return rgb(0.84, 0.70, 0.34)
    case 'S':
      return rgb(0.41, 0.55, 0.42)
    case 'C':
      return rgb(0.36, 0.43, 0.49)
    default:
      return rgb(0.4, 0.4, 0.4)
  }
}

function addPdfDetailPages(
  pdfDoc: Awaited<ReturnType<typeof PDFDocument.create>>,
  font: any,
  boldFont: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  sections: PdfReportSection[],
) {
  const visibleSections = sections.filter((section) => section.id !== 'header' && section.id !== 'profile-overview')
  if (!visibleSections.length) {
    return
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let cursorY = pageHeight - margin
  const contentWidth = pageWidth - margin * 2
  const cardPadding = 18
  const cardSpacing = 24

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index]

    if (section.id === 'header' || section.id === 'profile-overview') {
      continue
    }

    if (section.id.startsWith('insight-')) {
      const insights: PdfReportSection[] = [section]
      while (index + 1 < sections.length && sections[index + 1].id.startsWith('insight-')) {
        index += 1
        insights.push(sections[index])
      }
      const narrativeResult = drawNarrativePanelGrid(pdfDoc, page, insights, cursorY, pageWidth, pageHeight, margin, contentWidth, cardPadding, cardSpacing, font, boldFont)
      page = narrativeResult.page
      cursorY = narrativeResult.cursorY
      continue
    }

    const titleLines = splitPdfText(section.title, contentWidth - cardPadding * 2, boldFont, 16)
    const bodyLines = splitPdfText(section.text, contentWidth - cardPadding * 2, font, 11)
    const bulletLines = section.bullets.flatMap((bullet) => splitPdfText(`• ${bullet}`, contentWidth - cardPadding * 3, font, 10))
    const sectionHeight = titleLines.length * 20 + bodyLines.length * 16 + bulletLines.length * 16 + 88

    if (cursorY - sectionHeight < margin + cardSpacing) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      cursorY = pageHeight - margin
    }

    const accentColor = parseHexColor(section.accent)
    const cardBottom = cursorY - sectionHeight

    page.drawRectangle({ x: margin - 4, y: cardBottom - 4, width: contentWidth + 8, height: sectionHeight + 8, color: rgb(0.95, 0.93, 0.90) })
    page.drawRectangle({ x: margin, y: cardBottom, width: contentWidth, height: sectionHeight, color: rgb(0.99, 0.98, 0.95) })
    page.drawRectangle({ x: margin + cardPadding, y: cardBottom + sectionHeight - 22, width: 120, height: 6, color: accentColor })

    if (section.badge) {
      page.drawRectangle({ x: margin + contentWidth - 124, y: cardBottom + sectionHeight - 28, width: 116, height: 18, color: accentColor })
      page.drawText(section.badge.toUpperCase(), { x: margin + contentWidth - 118, y: cardBottom + sectionHeight - 24, size: 8, font: boldFont, color: rgb(1, 1, 1) })
    }

    let localY = cardBottom + sectionHeight - 40
    titleLines.forEach((line) => {
      page.drawText(line, { x: margin + cardPadding, y: localY, size: 16, font: boldFont, color: rgb(0.18, 0.12, 0.06) })
      localY -= 20
    })

    localY -= 8
    bodyLines.forEach((line) => {
      page.drawText(line, { x: margin + cardPadding, y: localY, size: 10, font: font, color: rgb(0.35, 0.25, 0.18) })
      localY -= 16
    })

    if (bulletLines.length) {
      localY -= 10
      bulletLines.forEach((line) => {
        page.drawText(line, { x: margin + cardPadding + 8, y: localY, size: 10, font: font, color: rgb(0.35, 0.25, 0.18) })
        localY -= 16
      })
    }

    cursorY = cardBottom - cardSpacing
  }
}

function drawNarrativePanelGrid(
  pdfDoc: Awaited<ReturnType<typeof PDFDocument.create>>,
  page: any,
  panels: PdfReportSection[],
  cursorY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  cardPadding: number,
  cardSpacing: number,
  font: any,
  boldFont: any,
) {
  const columnWidth = (contentWidth - cardSpacing) / 2
  const rowPanels: PdfReportSection[][] = []

  for (let i = 0; i < panels.length; i += 2) {
    rowPanels.push(panels.slice(i, i + 2))
  }

  rowPanels.forEach((row) => {
    const left = row[0]
    const right = row[1]
    const leftHeight = measureSectionHeight(left, columnWidth, cardPadding, font, boldFont)
    const rightHeight = right ? measureSectionHeight(right, columnWidth, cardPadding, font, boldFont) : leftHeight
    const rowHeight = Math.max(leftHeight, rightHeight)

    if (cursorY - rowHeight < margin + cardSpacing) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      cursorY = pageHeight - margin
    }

    const leftX = margin
    const rightX = margin + columnWidth + cardSpacing
    const cardBottom = cursorY - rowHeight

    drawTwoColumnCard(page, left, leftX, cardBottom, columnWidth, rowHeight, cardPadding, font, boldFont)
    if (right) {
      drawTwoColumnCard(page, right, rightX, cardBottom, columnWidth, rowHeight, cardPadding, font, boldFont)
    }

    cursorY = cardBottom - cardSpacing
  })

  return { page, cursorY }
}

function measureSectionHeight(section: PdfReportSection, width: number, padding: number, font: any, boldFont: any) {
  const titleLines = splitPdfText(section.title, width - padding * 2, boldFont, 16)
  const bodyLines = splitPdfText(section.text, width - padding * 2, font, 11)
  const bulletLines = section.bullets.flatMap((bullet) => splitPdfText(`• ${bullet}`, width - padding * 3, font, 10))
  return titleLines.length * 20 + bodyLines.length * 16 + bulletLines.length * 16 + 96
}

function drawTwoColumnCard(page: any, section: PdfReportSection, x: number, cardBottom: number, width: number, height: number, padding: number, font: any, boldFont: any) {
  const accentColor = parseHexColor(section.accent)

  page.drawRectangle({ x: x - 4, y: cardBottom - 4, width: width + 8, height: height + 8, color: rgb(0.95, 0.93, 0.90) })
  page.drawRectangle({ x, y: cardBottom, width, height, color: rgb(0.99, 0.98, 0.95) })
  page.drawRectangle({ x: x + padding, y: cardBottom + height - 22, width: 100, height: 6, color: accentColor })

  const titleLines = splitPdfText(section.title, width - padding * 2, boldFont, 16)
  const bodyLines = splitPdfText(section.text, width - padding * 2, font, 11)
  const bulletLines = section.bullets.flatMap((bullet) => splitPdfText(`• ${bullet}`, width - padding * 3, font, 10))

  let localY = cardBottom + height - 40
  titleLines.forEach((line) => {
    page.drawText(line, { x: x + padding, y: localY, size: 16, font: boldFont, color: rgb(0.18, 0.12, 0.06) })
    localY -= 20
  })

  localY -= 8
  bodyLines.forEach((line) => {
    page.drawText(line, { x: x + padding, y: localY, size: 10, font: font, color: rgb(0.35, 0.25, 0.18) })
    localY -= 16
  })

  if (bulletLines.length) {
    localY -= 10
    bulletLines.forEach((line) => {
      page.drawText(line, { x: x + padding + 8, y: localY, size: 10, font: font, color: rgb(0.35, 0.25, 0.18) })
      localY -= 16
    })
  }
}

function drawTraitChip(page: any, x: number, y: number, label: string, value: string, font: any, boldFont: any) {
  const chipWidth = 232
  page.drawRectangle({ x, y: y - 28, width: chipWidth, height: 28, color: rgb(0.96, 0.93, 0.88) })
  page.drawText(label.toUpperCase(), { x: x + 10, y: y - 10, size: 8, font: font, color: rgb(0.44, 0.33, 0.24) })
  page.drawText(value, { x: x + 10, y: y - 20, size: 11, font: boldFont, color: rgb(0.18, 0.11, 0.07) })
}

function splitPdfText(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
    } else {
      if (line) {
        lines.push(line)
      }
      line = word
    }
  }

  if (line) {
    lines.push(line)
  }

  return lines
}

function parseHexColor(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return rgb(0, 0, 0)
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255
  return rgb(r, g, b)
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
    profile?: DiscScoreResponse['profile'] | null
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
      const pdfBytes = await buildPdfReportPdfBytes(element, options)
      const blob = new Blob([Uint8Array.from(pdfBytes)], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${fileName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)

      return { ok: true, fileName: `${fileName}.pdf` }
    } catch (error) {
      console.error('Unable to generate the executive PDF export.', error)
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

export function buildExportLayoutSections(element: HTMLElement) {
  const sections = Array.from(element.querySelectorAll<HTMLElement>('[data-export-section]'))
    .map((section) => {
      const id = section.getAttribute('data-export-section') ?? 'section'
      const heading = section.querySelector<HTMLElement>('h1, h2, h3, h4')?.textContent?.trim() ?? ''
      const title = heading || getSectionTitle(id)
      const body = cleanText(section.innerText)
      const accent = getSectionAccent(id)
      return {
        id,
        title,
        body: body.slice(0, 520),
        accent,
        height: getSectionHeight(id, Math.max(260, Math.min(420, 210 + Math.ceil((body.length / 140) * 18)))),
      }
    })

  if (sections.length > 0) {
    return sections
  }

  const fallbackBody = cleanText(element.innerText)
  return [{
    id: 'report',
    title: 'Executive Report',
    body: fallbackBody.slice(0, 900),
    accent: '#8b5e3c',
    height: 420,
  }]
}

function cleanText(text?: string | null) {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

function getSectionTitle(id: string) {
  switch (id) {
    case 'header':
      return 'Executive Overview'
    case 'profile-overview':
      return 'Profile Overview'
    case 'footer':
      return 'Closing Notes'
    default:
      return id.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }
}

function getSectionAccent(id: string) {
  switch (id) {
    case 'header':
      return '#8b5e3c'
    case 'profile-overview':
      return '#5d6f7d'
    case 'footer':
      return '#688b6a'
    case 'core-strengths':
      return '#8b5e3c'
    case 'development-focus':
      return '#c78e69'
    default:
      return '#c78e69'
  }
}

function getSectionBadgeLabel(id: string) {
  switch (id) {
    case 'header':
      return 'Board Summary'
    case 'profile-overview':
      return 'Profile Insight'
    case 'footer':
      return 'Closing Note'
    case 'core-strengths':
      return 'Strength Focus'
    case 'development-focus':
      return 'Growth Area'
    default:
      if (id.startsWith('insight')) {
        return 'Insight'
      }
      return 'Feature'
  }
}

function extractSectionChips(rawText: string): PdfReportChip[] {
  const chips: PdfReportChip[] = []
  const regex = /(Completion date|Completion score|Document version):\s*([\s\S]*?)(?=(?:Completion date|Completion score|Document version):|$)/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(rawText))) {
    chips.push({ label: match[1], value: match[2].trim() })
  }
  return chips
}

function parseProfileTraits(rawText: string): PdfTraitSummary[] {
  const traits: PdfTraitSummary[] = []
  const regex = /([A-Z][a-z]+)\s+(\d+)%\s+(?:Raw(?: score)?:\s*)?(\d+)/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(rawText))) {
    traits.push({
      label: match[1],
      percentage: Number(match[2]),
      score: Number(match[3]),
    })
  }

  if (!traits.length) {
    const fallbackRegex = /([A-Z][a-z]+)\s+(\d+)%/gi
    while ((match = fallbackRegex.exec(rawText))) {
      traits.push({ label: match[1], percentage: Number(match[2]) })
    }
  }

  return traits
}

function getSectionHeight(id: string, defaultHeight: number) {
  switch (id) {
    case 'header':
      return Math.max(defaultHeight, 520)
    case 'profile-overview':
      return Math.max(defaultHeight, 520)
    case 'footer':
      return Math.max(defaultHeight, 180)
    default:
      return defaultHeight
  }
}


async function renderCanvasForExport(element: HTMLElement, options?: {
  profile?: DiscScoreResponse['profile'] | null
  primaryTrait?: TraitKey
  secondaryTrait?: TraitKey
  completionScore?: number
  generatedAt?: string
}): Promise<HTMLCanvasElement> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#fffaf4',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      width: element.scrollWidth || element.clientWidth || 1200,
      height: element.scrollHeight || element.clientHeight || 1800,
      removeContainer: true,
    })

    if (canvas instanceof HTMLCanvasElement) {
      return canvas
    }
  } catch (error) {
    console.warn('html2canvas export fallback activated:', error)
  }

  return buildFallbackExportCanvas(element, options)
}

function buildFallbackExportCanvas(element: HTMLElement, options?: {
  profile?: DiscScoreResponse['profile'] | null
  primaryTrait?: TraitKey
  secondaryTrait?: TraitKey
  completionScore?: number
  generatedAt?: string
}) {
  const canvas = document.createElement('canvas')
  canvas.width = 1400
  canvas.height = 1060
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Unable to create export canvas')
  }

  const width = canvas.width
  const height = canvas.height
  const padding = 64
  const profile = options?.profile
  const primaryTrait = options?.primaryTrait ?? profile?.primaryTrait ?? 'D'
  const secondaryTrait = options?.secondaryTrait ?? profile?.secondaryTrait ?? 'C'
  const completionScore = options?.completionScore ?? 0
  const generatedAt = options?.generatedAt ?? 'Not provided'
  const summary = profile?.narrative ?? cleanText(element.innerText).slice(0, 900)
  const scoreLines = (profile?.scores ?? []).slice(0, 4)
  const highlightLines = (profile?.highlights ?? []).slice(0, 3)
  const growthLines = (profile?.growthPoints ?? []).slice(0, 3)
  const layoutSections = buildExportLayoutSections(element)
  const traitPalette: Record<TraitKey, string> = {
    D: '#c78e69',
    I: '#d8b24a',
    S: '#688b6a',
    C: '#5d6f7d',
  }

  const baseBackground = ctx.createLinearGradient(0, 0, width, height)
  baseBackground.addColorStop(0, '#fffaf5')
  baseBackground.addColorStop(1, '#f2e1cf')
  ctx.fillStyle = baseBackground
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#fffdf9'
  roundRect(ctx, padding, padding, width - padding * 2, height - padding * 2, 28)
  ctx.fill()
  ctx.strokeStyle = '#e8dfd6'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#8b5e3c'
  ctx.font = '700 34px Arial'
  ctx.fillText('Northstar DISC', padding + 44, padding + 96)
  ctx.fillStyle = '#4c3a2e'
  ctx.font = '700 24px Arial'
  ctx.fillText('Executive Report Export', padding + 44, padding + 136)

  ctx.fillStyle = '#6b584d'
  ctx.font = '16px Arial'
  wrapText(ctx, summary, padding + 44, padding + 174, width - padding * 2 - 88, 24)

  drawMetricBadge(ctx, padding + 44, padding + 242, '#f7efe6', '#2f241d', 'Primary', primaryTrait)
  drawMetricBadge(ctx, padding + 300, padding + 242, '#f7efe6', '#2f241d', 'Secondary', secondaryTrait)
  drawMetricBadge(ctx, padding + 556, padding + 242, '#f7efe6', '#2f241d', 'Completion', `${completionScore}%`)
  drawMetricBadge(ctx, padding + 812, padding + 242, '#f7efe6', '#2f241d', 'Generated', generatedAt)

  const cardWidth = (width - padding * 2 - 36) / 2
  const leftX = padding + 28
  const rightX = padding + 28 + cardWidth + 20

  const coverCardY = padding + 320
  const pageBreakY = 520
  const secondPageY = pageBreakY + 20
  const insightsY = secondPageY + 240
  const highlightsY = insightsY + 220

  drawInfoCard(ctx, leftX, coverCardY, cardWidth, 180, '#fffdfb', '#8b5e3c', 'Signature Snapshot', `${primaryTrait}${secondaryTrait} leadership with a calm, decisive profile designed for coaching, hiring, and team alignment.`)

  drawTraitCard(ctx, leftX, secondPageY, cardWidth, 220, '#fffdfb', '#5d6f7d', 'Trait Performance', scoreLines, traitPalette)
  drawInfoCard(ctx, rightX, secondPageY, cardWidth, 220, '#fffdfb', '#688b6a', 'Board-Level Insights', [
    highlightLines[0] ? `Strength: ${highlightLines[0]}` : '',
    growthLines[0] ? `Development: ${growthLines[0]}` : '',
    highlightLines[1] ? `Strength: ${highlightLines[1]}` : '',
  ].filter(Boolean).join(' • '))
  drawInfoCard(ctx, leftX, insightsY, cardWidth, 200, '#fffdfb', '#c78e69', 'Report Highlights', layoutSections.slice(0, 2).map((section) => `${section.title}: ${section.body}`).join(' • '))

  ctx.fillStyle = '#f7efe6'
  roundRect(ctx, leftX, highlightsY + 220, width - padding * 2 - 56, 96, 20)
  ctx.fill()
  ctx.strokeStyle = '#eee5dc'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = '#2f241d'
  ctx.font = '700 20px Arial'
  ctx.fillText('Board packet ready', leftX + 18, highlightsY + 264)
  ctx.fillStyle = '#6b584d'
  ctx.font = '15px Arial'
  ctx.fillText('Premium layout, stronger balance, and executive narrative clarity.', leftX + 18, highlightsY + 288)

  return canvas
}

function drawInfoCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string, accent: string, title: string, body: string) {
  ctx.fillStyle = fill
  roundRect(ctx, x, y, width, height, 18)
  ctx.fill()
  ctx.strokeStyle = '#eee5dc'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = accent
  ctx.fillRect(x + 16, y + 18, 124, 4)

  ctx.fillStyle = '#2f241d'
  ctx.font = '700 19px Arial'
  ctx.fillText(title, x + 18, y + 52)
  ctx.fillStyle = '#6b584d'
  ctx.font = '15px Arial'
  wrapText(ctx, body, x + 18, y + 78, width - 36, 24)
}

function drawMetricBadge(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, textColor: string, label: string, value: string) {
  ctx.fillStyle = fill
  roundRect(ctx, x, y, 192, 44, 999)
  ctx.fill()
  ctx.fillStyle = textColor
  ctx.font = '700 11px Arial'
  ctx.fillText(label.toUpperCase(), x + 18, y + 18)
  ctx.font = '600 14px Arial'
  ctx.fillText(value, x + 18, y + 34)
}

function drawTraitCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string, accent: string, title: string, scores: Array<{ trait: TraitKey; percentage: number }>, palette: Record<TraitKey, string>) {
  ctx.fillStyle = fill
  roundRect(ctx, x, y, width, height, 18)
  ctx.fill()
  ctx.strokeStyle = '#eee5dc'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = accent
  ctx.fillRect(x + 16, y + 18, 124, 4)

  ctx.fillStyle = '#2f241d'
  ctx.font = '700 19px Arial'
  ctx.fillText(title, x + 18, y + 52)

  const rowStart = y + 80
  const rowHeight = 36
  scores.forEach((item, index) => {
    const rowY = rowStart + index * (rowHeight + 10)
    const barWidth = Math.max(28, ((width - 78) * item.percentage) / 100)

    ctx.fillStyle = '#f3e6d8'
    roundRect(ctx, x + 18, rowY, width - 52, rowHeight, 10)
    ctx.fill()
    ctx.fillStyle = palette[item.trait]
    roundRect(ctx, x + 18, rowY, barWidth, rowHeight, 10)
    ctx.fill()

    ctx.fillStyle = '#2f241d'
    ctx.font = '600 14px Arial'
    ctx.fillText(`${item.trait} ${item.percentage}%`, x + 24, rowY + 22)
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


function buildFallbackExportDataUrl(element: HTMLElement) {
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    return 'data:image/png;base64,00'
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1600
  const ctx = canvas.getContext?.('2d')

  if (!ctx) {
    return 'data:image/png;base64,00'
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

