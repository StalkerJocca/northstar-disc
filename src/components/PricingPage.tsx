import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { startEnterpriseCheckout, startExecutiveCheckout, startTeamCheckout } from '../lib/payments'

type Props = { onStart: () => void }
type Plan = 'executive' | 'team' | 'enterprise'

export default function PricingPage({ onStart }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const checkout = async (plan: Plan) => {
    setLoading(plan); setError(null)
    try { if (plan === 'executive') await startExecutiveCheckout(); else if (plan === 'team') await startTeamCheckout(); else await startEnterpriseCheckout() } catch (reason) { setError(reason instanceof Error ? reason.message : t('checkout.verificationError')); setLoading(null) }
  }
  const plans = ['free', 'executive', 'team', 'enterprise'] as const
  return <section id="pricing" className="mt-10 rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_18px_50px_-24px_rgba(84,56,45,0.22)] sm:p-8"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[.25em] text-[#8b5e3c]">{t('pricing.eyebrow')}</p><h2 className="mt-3 text-3xl font-semibold text-stone-900">{t('pricing.title')}</h2><p className="mt-3 text-sm leading-7 text-stone-600">{t('pricing.subtitle')}</p></div><div className="mt-8 grid gap-4 lg:grid-cols-4">{plans.map((plan) => <article key={plan} className={`relative flex flex-col rounded-[1.5rem] border p-5 ${plan === 'enterprise' ? 'border-[#c78e69] bg-[#fff8f2] shadow-sm' : 'border-stone-200 bg-stone-50'}`}>{plan === 'enterprise' ? <span className="absolute -top-3 self-center rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">{t('pricing.recommended')}</span> : null}<h3 className="text-lg font-semibold text-stone-900">{t(`pricing.${plan}.name`)}</h3><p className="mt-2 text-2xl font-bold text-stone-900">{t(`pricing.${plan}.price`)}</p><ul className="mt-5 flex-1 space-y-3 text-sm leading-6 text-stone-700">{(t(`pricing.${plan}.features`, { returnObjects: true }) as string[]).map((feature) => <li key={feature} className="flex gap-2"><span className="text-[#8b5e3c]">✓</span>{feature}</li>)}</ul><button type="button" onClick={plan === 'free' ? onStart : () => void checkout(plan)} disabled={loading !== null} className="mt-6 rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading === plan ? t('enterprise.redirecting') : t(`pricing.${plan}.cta`)}</button></article>)}</div>{error ? <p className="mt-5 text-center text-sm text-red-700">{error}</p> : null}<p className="mt-5 text-center text-xs text-stone-500">{t('pricing.secure')}</p></section>
}
