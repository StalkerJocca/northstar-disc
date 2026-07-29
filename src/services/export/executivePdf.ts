import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ExecutivePdfLabels } from '../../components/exports/ExecutivePdfReport'
import type { DiscProfile, TraitKey } from '../../types/disc'

type ExecutivePdfOptions = {
  profile: DiscProfile | null
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  candidateName: string
  generatedAt: string
  labels: ExecutivePdfLabels
}

export async function downloadExecutivePdf(options: ExecutivePdfOptions) {
  const [{ pdf }, { default: ExecutivePdfReport }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../../components/exports/ExecutivePdfReport'),
  ])
  const document = createElement(ExecutivePdfReport, options)
  const blob = await pdf(document as ReactElement<DocumentProps>).toBlob()
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = 'northstar-disc-executive-report.pdf'
  link.click()
  URL.revokeObjectURL(url)
}
