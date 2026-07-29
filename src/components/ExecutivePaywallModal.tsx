import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

type ExecutivePaywallModalProps = { open: boolean; onClose: () => void; onCheckout: () => void; isStartingCheckout: boolean; error: string | null }

export default function ExecutivePaywallModal({ open, onClose, onCheckout, isStartingCheckout, error }: ExecutivePaywallModalProps) {
  const { t } = useTranslation()
  if (!open) return null
  const benefits = t('paywall.benefits', { returnObjects: true }) as string[]
  return <div className="print-hide fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="executive-paywall-title">
    <motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-lg rounded-[2rem] border border-stone-200 bg-[linear-gradient(135deg,_#fffaf5,_#f1e2d3)] p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.24em] text-[#8b5e3c]">{t('paywall.badge')}</p><h2 id="executive-paywall-title" className="mt-2 text-2xl font-semibold text-stone-900">{t('paywall.title')}</h2></div><button type="button" onClick={onClose} className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-600">{t('paywall.close')}</button></div>
      <p className="mt-3 text-sm leading-7 text-stone-700">{t('paywall.description')}</p><ul className="mt-4 space-y-2 text-sm leading-6 text-stone-700">{benefits.map((benefit) => <li key={benefit} className="flex gap-2"><span className="font-bold text-[#8b5e3c]">✓</span>{benefit}</li>)}</ul>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}<button type="button" onClick={onCheckout} disabled={isStartingCheckout} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{isStartingCheckout ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}{isStartingCheckout ? t('paywall.redirecting') : t('paywall.purchase')}</button><p className="mt-3 text-center text-xs text-stone-500">{t('paywall.secure')}</p>
    </motion.div>
  </div>
}
