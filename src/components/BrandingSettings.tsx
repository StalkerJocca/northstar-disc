import { useEffect, useState } from 'react'
import { useBranding } from '../contexts/BrandingContext'
import type { BrandingConfig } from '../theme.config'

type Props = {
  isLicensed: boolean
  onUpgrade: () => void
  onSaveAndExport: (branding: BrandingConfig) => void
}

export default function BrandingSettings({ isLicensed, onUpgrade, onSaveAndExport }: Props) {
  const { branding, setBranding } = useBranding()
  const [draft, setDraft] = useState(branding)
  useEffect(() => setDraft(branding), [branding])
  const update = (key: keyof BrandingConfig, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const saveAndExport = () => { setBranding(draft); onSaveAndExport(draft) }

  return <section aria-labelledby="white-label-settings-title">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-[#8b5e3c]">Coach / Enterprise</p><h3 id="white-label-settings-title" className="mt-1 font-semibold text-stone-900">Custom Branding / White-Label</h3></div><span className="rounded-full bg-stone-900 px-2 py-1 text-[10px] font-bold text-white">PAID</span></div>
    <p className="mt-2 text-sm leading-6 text-stone-600">Set the co-branded details that appear on your Executive PDF.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-medium text-stone-600">Coach or agency name<input value={draft.agencyName} onChange={(event) => update('agencyName', event.target.value)} placeholder="Your agency" className="mt-1 w-full rounded-xl border border-stone-200 p-2 text-sm" /></label>
      <label className="text-xs font-medium text-stone-600">Primary accent colour<input type="color" value={draft.accentColor} onChange={(event) => update('accentColor', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-stone-200 p-1" /></label>
      <label className="text-xs font-medium text-stone-600">Custom logo URL<input value={draft.logoUrl} onChange={(event) => update('logoUrl', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-xl border border-stone-200 p-2 text-sm" /></label>
      <label className="text-xs font-medium text-stone-600">Custom report footer<input value={draft.footerNote} onChange={(event) => update('footerNote', event.target.value)} placeholder="Prepared for your organisation" className="mt-1 w-full rounded-xl border border-stone-200 p-2 text-sm" /></label>
      <label className="text-xs font-medium text-stone-600">Report typography<select value={draft.typography} onChange={(event) => update('typography', event.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 p-2 text-sm"><option value="serif">Executive serif</option><option value="modern">Modern sans</option></select></label>
    </div>
    <div className="relative mt-4 overflow-hidden rounded-xl border bg-white p-4" style={{ borderColor: draft.accentColor }} aria-label="Co-branded Executive PDF preview">
      {!isLicensed ? <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 whitespace-nowrap text-lg font-bold tracking-[.16em] text-stone-900/10">WHITE-LABEL PREVIEW</span> : null}
      <div className="relative flex items-center gap-2 text-sm font-semibold" style={{ color: draft.accentColor }}>{draft.logoUrl ? <img src={draft.logoUrl} alt="Agency logo preview" className="h-7 w-7 object-contain" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : null}Prepared by {draft.agencyName || 'Your Agency'} <span className="font-normal text-stone-500">| Powered by Northstar DISC</span></div>
      <p className="relative mt-8 border-t border-stone-100 pt-2 text-xs text-stone-500">{draft.footerNote || 'Executive behavioural profile'}</p>
    </div>
    {isLicensed ? <button type="button" onClick={saveAndExport} className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">Save Branding &amp; Export</button> : <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-stone-500">Preview only · Upgrade to export without the watermark.</p><button type="button" onClick={onUpgrade} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">Upgrade to White-Label</button></div>}
  </section>
}
