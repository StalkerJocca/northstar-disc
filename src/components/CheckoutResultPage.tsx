import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { verifyEnterpriseLicense, verifyExecutivePurchase, verifyTeamPurchase } from '../lib/payments'

type Product = 'executive' | 'team' | 'enterprise'
const validProduct = (value: string | null): value is Product => value === 'executive' || value === 'team' || value === 'enterprise'

export default function CheckoutResultPage() {
  const { t } = useTranslation(); const params = new URLSearchParams(window.location.search); const success = window.location.pathname === '/checkout/success'; const product = validProduct(params.get('product')) ? params.get('product') : null; const session = params.get('session_id'); const [confirmed, setConfirmed] = useState(!success); const [failed, setFailed] = useState(false)
  useEffect(() => { if (!success || !product || !session) { if (success) setFailed(true); return }; const verify = product === 'executive' ? verifyExecutivePurchase : product === 'team' ? verifyTeamPurchase : verifyEnterpriseLicense; void verify(session).then((paid) => { setConfirmed(paid); setFailed(!paid) }).catch(() => setFailed(true)) }, [product, session, success])
  const title = success ? t('checkout.successTitle') : t('checkout.cancelTitle'); const body = success ? t('checkout.successBody') : t('checkout.cancelBody')
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8efe9,_#fcfaf7_60%,_#f4ebe3)] p-4"><section className="w-full max-w-lg rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-2xl" role="dialog" aria-modal="true"><p className="text-xs font-semibold uppercase tracking-[.25em] text-[#8b5e3c]">{success ? t('checkout.successEyebrow') : t('checkout.cancelEyebrow')}</p>{success && !confirmed && !failed ? <p className="mt-5 text-sm text-stone-600">{t('checkout.verifying')}</p> : <><div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1e2d3] text-2xl">{success && !failed ? '✓' : '↩'}</div><h1 className="mt-5 text-2xl font-semibold text-stone-900">{failed ? t('checkout.verificationError') : title}</h1><p className="mt-3 text-sm leading-7 text-stone-600">{failed ? t('checkout.verificationError') : body}</p><a href="/" className="mt-7 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">{t('checkout.return')}</a></>}</section></main>
}
