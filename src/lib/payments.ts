import type { TraitKey } from '../types/disc'

const PURCHASE_STORAGE_KEY = 'northstar-disc.executive-purchase-session'

export async function startExecutiveCheckout(primaryTrait: TraitKey, secondaryTrait: TraitKey) {
  const response = await fetch('/api/create-executive-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: window.location.origin, profileCode: `${primaryTrait}${secondaryTrait}` }) })
  const body = await response.json() as { url?: string; error?: string }
  if (!response.ok || !body.url) throw new Error(body.error ?? 'Checkout is unavailable.')
  window.location.assign(body.url)
}

export async function verifyExecutivePurchase(sessionId: string) {
  const response = await fetch(`/api/verify-executive-purchase?session_id=${encodeURIComponent(sessionId)}`)
  const body = await response.json() as { paid?: boolean }
  if (body.paid) window.localStorage.setItem(PURCHASE_STORAGE_KEY, sessionId)
  return Boolean(body.paid)
}

export const getStoredExecutivePurchase = () => typeof window === 'undefined' ? null : window.localStorage.getItem(PURCHASE_STORAGE_KEY)
