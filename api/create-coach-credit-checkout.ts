import Stripe from 'stripe'
import { getAuthenticatedUser } from './supabase.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const user = await getAuthenticatedUser(request); const secretKey = process.env.STRIPE_SECRET_KEY; const priceId = process.env.STRIPE_COACH_CREDIT_PACK_PRICE_ID
  if (!user) return Response.json({ error: 'Please sign in before purchasing credits.' }, { status: 401 })
  if (!secretKey || !priceId) return Response.json({ error: 'Coach credit checkout is not configured.' }, { status: 503 })
  const credits = Math.max(1, Number.parseInt(process.env.STRIPE_COACH_CREDIT_PACK_SIZE ?? '5', 10) || 5)
  const origin = new URL(request.url).origin
  const session = await new Stripe(secretKey).checkout.sessions.create({ mode: 'payment', line_items: [{ price: priceId, quantity: 1 }], client_reference_id: user.id, success_url: `${origin}/workspace?credits_checkout=success`, cancel_url: `${origin}/workspace?credits_checkout=cancel`, metadata: { product: 'northstar_coach_credits', user_id: user.id, credits: String(credits), price_id: priceId } })
  return Response.json({ url: session.url })
}
