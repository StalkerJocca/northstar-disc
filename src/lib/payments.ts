import type { TraitKey } from '../types/disc'
import { supabase } from './supabase'

const PURCHASE_STORAGE_KEY = 'northstar-disc.executive-purchase-session'
const TEAM_PURCHASE_STORAGE_KEY = 'northstar-disc.team-purchase-session'
const ENTERPRISE_LICENSE_STORAGE_KEY = 'northstar-disc.enterprise-license-session'

type CheckoutResponse = { url?: string; error?: string }

async function startCheckout(endpoint: string, body?: object) {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
  if (!data.session?.access_token) throw new Error('Please sign in to purchase and save your entitlement.')
  const response = await fetch(endpoint, { method: 'POST', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${data.session.access_token}` }, body: body ? JSON.stringify(body) : undefined })
  const result = await response.json().catch(() => ({})) as CheckoutResponse
  if (!response.ok || !result.url) throw new Error(result.error ?? 'Checkout is unavailable. Please contact support if this persists.')
  return result.url
}

export async function startExecutiveCheckout(primaryTrait?: TraitKey, secondaryTrait?: TraitKey) {
  const url = await startCheckout('/api/create-executive-checkout', primaryTrait && secondaryTrait ? { profileCode: `${primaryTrait}${secondaryTrait}` } : undefined)
  window.location.assign(url)
}

export async function verifyExecutivePurchase(sessionId: string) {
  const response = await fetch(`/api/verify-executive-purchase?session_id=${encodeURIComponent(sessionId)}`)
  const body = await response.json() as { paid?: boolean }
  if (body.paid) window.localStorage.setItem(PURCHASE_STORAGE_KEY, sessionId)
  return Boolean(body.paid)
}

export const getStoredExecutivePurchase = () => typeof window === 'undefined' ? null : window.localStorage.getItem(PURCHASE_STORAGE_KEY)

export async function startTeamCheckout() {
  window.location.assign(await startCheckout('/api/create-team-analysis-checkout'))
}

export async function verifyTeamPurchase(sessionId: string) {
  const response = await fetch(`/api/verify-team-analysis-purchase?session_id=${encodeURIComponent(sessionId)}`)
  const body = await response.json() as { paid?: boolean }
  if (body.paid) window.localStorage.setItem(TEAM_PURCHASE_STORAGE_KEY, sessionId)
  return Boolean(body.paid)
}

export const getStoredTeamPurchase = () => typeof window === 'undefined' ? null : window.localStorage.getItem(TEAM_PURCHASE_STORAGE_KEY)

export async function startEnterpriseCheckout() {
  window.location.assign(await startCheckout('/api/create-enterprise-checkout'))
}

export async function verifyEnterpriseLicense(sessionId: string) {
  const response = await fetch(`/api/verify-enterprise-purchase?session_id=${encodeURIComponent(sessionId)}`)
  const body = await response.json() as { paid?: boolean }
  if (body.paid) window.localStorage.setItem(ENTERPRISE_LICENSE_STORAGE_KEY, sessionId)
  return Boolean(body.paid)
}

export const getStoredEnterpriseLicense = () => typeof window === 'undefined' ? null : window.localStorage.getItem(ENTERPRISE_LICENSE_STORAGE_KEY)
