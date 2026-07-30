import type { TraitKey } from '../types/disc'
import { supabase } from './supabase'

type CheckoutResponse = { url?: string; error?: string }
export type EntitlementPlan = 'free' | 'executive' | 'team' | 'enterprise'

async function authenticatedHeaders() {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
  if (!data.session?.access_token) throw new Error('Please sign in to purchase and save your entitlement.')
  return { Authorization: `Bearer ${data.session.access_token}` }
}

async function startCheckout(endpoint: string, body?: object) {
  const authorization = await authenticatedHeaders()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15_000)
  let response: Response
  try {
    response = await fetch(endpoint, { method: 'POST', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...authorization }, body: body ? JSON.stringify(body) : undefined, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Checkout is taking too long. Please try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
  const result = await response.json().catch(() => ({})) as CheckoutResponse
  if (!response.ok || !result.url) throw new Error(result.error ?? 'Checkout is unavailable. Please contact support if this persists.')
  return result.url
}

export async function startExecutiveCheckout(primaryTrait?: TraitKey, secondaryTrait?: TraitKey) {
  const url = await startCheckout('/api/payments?action=checkout&product=executive', primaryTrait && secondaryTrait ? { profileCode: `${primaryTrait}${secondaryTrait}` } : undefined)
  window.location.assign(url)
}

export async function verifyExecutivePurchase(sessionId: string) {
  const response = await fetch(`/api/payments?action=verify&product=executive&session_id=${encodeURIComponent(sessionId)}`, { headers: await authenticatedHeaders() })
  const body = await response.json() as { paid?: boolean }
  return Boolean(body.paid)
}

export async function startTeamCheckout() {
  window.location.assign(await startCheckout('/api/payments?action=checkout&product=team'))
}

export async function verifyTeamPurchase(sessionId: string) {
  const response = await fetch(`/api/payments?action=verify&product=team&session_id=${encodeURIComponent(sessionId)}`, { headers: await authenticatedHeaders() })
  const body = await response.json() as { paid?: boolean }
  return Boolean(body.paid)
}

export async function startEnterpriseCheckout() {
  window.location.assign(await startCheckout('/api/payments?action=checkout&product=enterprise'))
}

export async function verifyEnterpriseLicense(sessionId: string) {
  const response = await fetch(`/api/payments?action=verify&product=enterprise&session_id=${encodeURIComponent(sessionId)}`, { headers: await authenticatedHeaders() })
  const body = await response.json() as { paid?: boolean }
  return Boolean(body.paid)
}

export async function getEntitlement(): Promise<EntitlementPlan> {
  const response = await fetch('/api/payments?action=entitlements', { headers: await authenticatedHeaders() })
  const body = await response.json().catch(() => ({})) as { plan?: string }
  if (!response.ok || !['free', 'executive', 'team', 'enterprise'].includes(body.plan ?? '')) throw new Error('Unable to retrieve your billing entitlement.')
  return body.plan as EntitlementPlan
}
