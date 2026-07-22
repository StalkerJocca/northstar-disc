import { useCallback, useMemo, useState } from 'react'
import { exportShareCard } from '../lib/share'
import type { DiscScoreResponse, TraitKey } from '../types/disc'

type useExportReportProps = {
  profile: DiscScoreResponse['profile'] | null
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  completionScore: number
  fileName?: string
}

export function useExportReport({ profile, primaryTrait, secondaryTrait, completionScore, fileName = 'northstar-disc-report' }: useExportReportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const generatedAt = useMemo(() => new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }), [])

  const exportReport = useCallback(async (format: 'png' | 'pdf' = 'png', target: HTMLElement | null) => {
    if (!target) {
      setExportError('No report content available for export.')
      return { ok: false, error: 'No report content available for export.' }
    }

    setIsExporting(true)
    setExportError(null)

    try {
      const result = await exportShareCard(target, {
        fileName,
        format,
        profile,
        primaryTrait,
        secondaryTrait,
        completionScore,
        generatedAt,
      })

      if (!result.ok) {
        setExportError(result.error ?? 'Export failed.')
      }

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.'
      setExportError(message)
      return { ok: false, error: message }
    } finally {
      setIsExporting(false)
    }
  }, [completionScore, fileName, generatedAt, primaryTrait, profile, secondaryTrait])

  return { isExporting, exportError, exportReport, generatedAt }
}
