import Stripe from 'stripe'

export async function GET(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_ENTERPRISE_WHITE_LABEL_PRICE_ID
  const sessionId = new URL(request.url).searchParams.get('session_id')
  if (!secretKey || !priceId || !sessionId) return Response.json({ paid: false }, { status: 400 })

  const stripe = new Stripe(secretKey)
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items', 'subscription'] })
  const hasExpectedPrice = session.line_items?.data.some((item) => item.price?.id === priceId) ?? false
  const subscription = typeof session.subscription === 'object' && session.subscription ? session.subscription : null
  return Response.json({ paid: hasExpectedPrice && subscription?.status === 'active' })
}
