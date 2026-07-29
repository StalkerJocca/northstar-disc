import Stripe from 'stripe'
import { getAuthenticatedUser } from './supabase.js'

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_TEAM_ANALYSIS_PRICE_ID
  if (!secretKey || !priceId) return Response.json({ error: 'Stripe team analysis checkout is not configured.' }, { status: 503 })
  const user = await getAuthenticatedUser(request)
  if (!user) return Response.json({ error: 'Please sign in before checkout.' }, { status: 401 })
  const origin = new URL(request.url).origin
  const stripe = new Stripe(secretKey)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    success_url: `${origin}/checkout/success?product=team&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel?product=team`,
    metadata: { product: 'northstar_team_analysis', user_id: user.id, price_id: priceId },
  })
  return Response.json({ url: session.url })
}
