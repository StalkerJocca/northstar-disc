import BrandingSettings from './BrandingSettings'
import type { BrandingConfig } from '../theme.config'

type Props = { open: boolean; isLicensed: boolean; onClose: () => void; onUpgrade: () => void; onSaveAndExport: (branding: BrandingConfig) => void }

export default function WhiteLabelBrandingModal({ open, isLicensed, onClose, onUpgrade, onSaveAndExport }: Props) {
  if (!open) return null
  return <div className="print-hide fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="white-label-settings-title">
    <div className="my-auto w-full max-w-2xl rounded-[2rem] border border-stone-200 bg-[linear-gradient(135deg,_#fffaf5,_#f1e2d3)] p-6 shadow-2xl"><div className="flex justify-end"><button type="button" onClick={onClose} className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-600">Close</button></div><BrandingSettings isLicensed={isLicensed} onUpgrade={onUpgrade} onSaveAndExport={onSaveAndExport} /></div>
  </div>
}
