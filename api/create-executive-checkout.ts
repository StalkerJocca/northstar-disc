import Stripe from 'stripe'
import { getAuthenticatedUser } from './supabase.js'

export default async function handler(request: Request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_EXECUTIVE_REPORT_PRICE_ID
  if (!secretKey || !priceId) return Response.json({ error: 'Stripe executive report checkout is not configured.' }, { status: 503 })
  const user = await getAuthenticatedUser(request)
  if (!user) return Response.json({ error: 'Please sign in before checkout.' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { profileCode?: unknown }
  const origin = new URL(request.url).origin
  const stripe = new Stripe(secretKey)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    success_url: `${origin}/checkout/success?product=executive&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel?product=executive`,
    metadata: { product: 'northstar_executive_report', user_id: user.id, price_id: priceId, profileCode: typeof body.profileCode === 'string' && /^[DISC]{2}$/.test(body.profileCode) ? body.profileCode : '' },
  })
  return Response.json({ url: session.url })
}
