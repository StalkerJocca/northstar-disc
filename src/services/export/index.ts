import type { DiscProfile, TraitKey } from '../../types/disc'

export type ExportFormat = 'png' | 'pdf'

export type ReportExportOptions = {
  fileName?: string
  format?: ExportFormat
  profile?: DiscProfile | null
  primaryTrait?: TraitKey
  secondaryTrait?: TraitKey
  completionScore?: number
  generatedAt?: string
  language?: string
}

export type ExportResult = { ok: true; fileName: string } | { ok: false; error: string }

/** Browser-only export boundary. Heavy renderers are loaded only on user intent. */
export async function exportReportDocument(element: HTMLElement, options?: ReportExportOptions): Promise<ExportResult> {
  const { exportShareCard } = await import('../../lib/share')
  const result = await exportShareCard(element, options)
  return result.ok
    ? { ok: true, fileName: result.fileName ?? 'northstar-disc-export' }
    : { ok: false, error: result.error ?? 'Export failed.' }
}

export async function generateSocialCardImage(options: {
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  profile?: DiscProfile | null
  url?: string
  referralCode?: string
  language?: string
}): Promise<Blob> {
  const { generateSocialShareCardImage } = await import('../../lib/share')
  return generateSocialShareCardImage(options)
}
