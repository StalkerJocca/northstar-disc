import Stripe from 'stripe'

export async function GET(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_EXECUTIVE_REPORT_PRICE_ID
  const sessionId = new URL(request.url).searchParams.get('session_id')
  if (!secretKey || !priceId || !sessionId) return Response.json({ paid: false }, { status: 400 })
  const stripe = new Stripe(secretKey)
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] })
  const hasExpectedPrice = session.line_items?.data.some((item) => item.price?.id === priceId) ?? false
  return Response.json({ paid: session.payment_status === 'paid' && hasExpectedPrice })
}
