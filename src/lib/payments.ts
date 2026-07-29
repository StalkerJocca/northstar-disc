import type { TraitKey } from '../types/disc'

const PURCHASE_STORAGE_KEY = 'northstar-disc.executive-purchase-session'
const TEAM_PURCHASE_STORAGE_KEY = 'northstar-disc.team-purchase-session'
const ENTERPRISE_LICENSE_STORAGE_KEY = 'northstar-disc.enterprise-license-session'

export async function startExecutiveCheckout(primaryTrait: TraitKey, secondaryTrait: TraitKey) {
  const response = await fetch('/api/create-executive-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileCode: `${primaryTrait}${secondaryTrait}` }) })
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

export async function startTeamCheckout() {
  const response = await fetch('/api/create-team-analysis-checkout', { method: 'POST' })
  const body = await response.json() as { url?: string; error?: string }
  if (!response.ok || !body.url) throw new Error(body.error ?? 'Checkout is unavailable.')
  window.location.assign(body.url)
}

export async function verifyTeamPurchase(sessionId: string) {
  const response = await fetch(`/api/verify-team-analysis-purchase?session_id=${encodeURIComponent(sessionId)}`)
  const body = await response.json() as { paid?: boolean }
  if (body.paid) window.localStorage.setItem(TEAM_PURCHASE_STORAGE_KEY, sessionId)
  return Boolean(body.paid)
}

export const getStoredTeamPurchase = () => typeof window === 'undefined' ? null : window.localStorage.getItem(TEAM_PURCHASE_STORAGE_KEY)

export async function startEnterpriseCheckout() {
  const response = await fetch('/api/create-enterprise-checkout', { method: 'POST' })
  const body = await response.json() as { url?: string; error?: string }
  if (!response.ok || !body.url) throw new Error(body.error ?? 'Enterprise checkout is unavailable.')
  window.location.assign(body.url)
}

export async function verifyEnterpriseLicense(sessionId: string) {
  const response = await fetch(`/api/verify-enterprise-purchase?session_id=${encodeURIComponent(sessionId)}`)
  const body = await response.json() as { paid?: boolean }
  if (body.paid) window.localStorage.setItem(ENTERPRISE_LICENSE_STORAGE_KEY, sessionId)
  return Boolean(body.paid)
}

export const getStoredEnterpriseLicense = () => typeof window === 'undefined' ? null : window.localStorage.getItem(ENTERPRISE_LICENSE_STORAGE_KEY)
