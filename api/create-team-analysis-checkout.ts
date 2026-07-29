import Stripe from 'stripe'

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_TEAM_ANALYSIS_PRICE_ID
  if (!secretKey || !priceId) return Response.json({ error: 'Stripe team analysis checkout is not configured.' }, { status: 503 })
  const origin = new URL(request.url).origin
  const stripe = new Stripe(secretKey)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?team_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?team_checkout=cancelled`,
    metadata: { product: 'northstar_team_analysis' },
  })
  return Response.json({ url: session.url })
}
