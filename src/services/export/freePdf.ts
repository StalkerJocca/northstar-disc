import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import type { DiscProfile, TraitKey } from '../../types/disc'

type FreePdfOptions = { profile: DiscProfile | null; primaryTrait: TraitKey; secondaryTrait: TraitKey; generatedAt: string; labels: { brand: string; title: string; summary: string; strengths: string; generated: string; traitNames: Record<TraitKey, string>; narrative: string; highlights: string[] } }

export async function downloadFreePdf(options: FreePdfOptions) {
  const [{ pdf }, { default: FreePdfReport }] = await Promise.all([import('@react-pdf/renderer'), import('../../components/exports/FreePdfReport')])
  const blob = await pdf(createElement(FreePdfReport, options) as ReactElement<DocumentProps>).toBlob()
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = 'northstar-disc-free-report.pdf'
  link.click()
  URL.revokeObjectURL(url)
}
