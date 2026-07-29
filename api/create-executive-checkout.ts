import Stripe from 'stripe'

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_EXECUTIVE_REPORT_PRICE_ID
  if (!secretKey || !priceId) return Response.json({ error: 'Stripe executive report checkout is not configured.' }, { status: 503 })

  const body = await request.json().catch(() => ({})) as { origin?: unknown; profileCode?: unknown }
  const origin = typeof body.origin === 'string' && /^https?:\/\//.test(body.origin) ? body.origin : new URL(request.url).origin
  const stripe = new Stripe(secretKey)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?pro_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    metadata: { product: 'northstar_executive_report', profileCode: typeof body.profileCode === 'string' ? body.profileCode.slice(0, 2) : '' },
  })
  return Response.json({ url: session.url })
}
