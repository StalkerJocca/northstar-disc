import Stripe from 'stripe'

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_ENTERPRISE_WHITE_LABEL_PRICE_ID
  if (!secretKey || !priceId) return Response.json({ error: 'Stripe Enterprise white-label checkout is not configured.' }, { status: 503 })

  const origin = new URL(request.url).origin
  const stripe = new Stripe(secretKey)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?enterprise_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    metadata: { product: 'northstar_enterprise_white_label' },
  })
  return Response.json({ url: session.url })
}
