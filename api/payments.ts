import Stripe from 'stripe'
import { getAuthenticatedUser, getSupabaseAdmin } from '../server/supabase.js'

type Product = 'executive' | 'team' | 'enterprise'

const products: Record<Product, { priceEnvironment: string; metadataProduct: string; mode: 'payment' | 'subscription' }> = {
  executive: { priceEnvironment: 'STRIPE_EXECUTIVE_REPORT_PRICE_ID', metadataProduct: 'northstar_executive_report', mode: 'payment' },
  team: { priceEnvironment: 'STRIPE_TEAM_ANALYSIS_PRICE_ID', metadataProduct: 'northstar_team_analysis', mode: 'payment' },
  enterprise: { priceEnvironment: 'STRIPE_ENTERPRISE_WHITE_LABEL_PRICE_ID', metadataProduct: 'northstar_enterprise_white_label', mode: 'subscription' },
}

const badRequest = (error: string) => Response.json({ error }, { status: 400 })

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  if (action === 'verify') return verifyPurchase(request, url)
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  if (action === 'checkout') return createCheckout(request, url)
  if (action === 'portal') return createCustomerPortal(request)
  return badRequest('Unknown payment action.')
}

function getProduct(value: string | null): Product | null {
  return value === 'executive' || value === 'team' || value === 'enterprise' ? value : null
}

async function createCheckout(request: Request, url: URL): Promise<Response> {
  const product = getProduct(url.searchParams.get('product'))
  const user = await getAuthenticatedUser(request)
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!product) return badRequest('Unknown checkout product.')
  if (!user) return Response.json({ error: 'Please sign in before checkout.' }, { status: 401 })
  const config = products[product]; const priceId = process.env[config.priceEnvironment]
  if (!secretKey || !priceId) return Response.json({ error: `Stripe ${product} checkout is not configured.` }, { status: 503 })
  const body = await request.json().catch(() => ({})) as { profileCode?: unknown }
  const metadata: Record<string, string> = { product: config.metadataProduct, user_id: user.id, price_id: priceId }
  if (product === 'executive') metadata.profileCode = typeof body.profileCode === 'string' && /^[DISC]{2}$/.test(body.profileCode) ? body.profileCode : ''
  const session = await new Stripe(secretKey).checkout.sessions.create({
    mode: config.mode,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    success_url: `${url.origin}/checkout/success?product=${product}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${url.origin}/checkout/cancel?product=${product}`,
    metadata,
  })
  return Response.json({ url: session.url })
}

async function verifyPurchase(request: Request, url: URL): Promise<Response> {
  if (request.method !== 'GET') return Response.json({ paid: false }, { status: 405 })
  const product = getProduct(url.searchParams.get('product')); const sessionId = url.searchParams.get('session_id'); const secretKey = process.env.STRIPE_SECRET_KEY
  if (!product || !sessionId || !secretKey) return Response.json({ paid: false }, { status: 400 })
  const priceId = process.env[products[product].priceEnvironment]
  if (!priceId) return Response.json({ paid: false }, { status: 400 })
  const session = await new Stripe(secretKey).checkout.sessions.retrieve(sessionId, { expand: product === 'enterprise' ? ['line_items', 'subscription'] : ['line_items'] })
  const hasExpectedPrice = session.line_items?.data.some((item) => item.price?.id === priceId) ?? false
  if (product !== 'enterprise') return Response.json({ paid: session.payment_status === 'paid' && hasExpectedPrice })
  const subscription = typeof session.subscription === 'object' && session.subscription ? session.subscription : null
  return Response.json({ paid: hasExpectedPrice && subscription?.status === 'active' })
}

async function createCustomerPortal(request: Request): Promise<Response> {
  const user = await getAuthenticatedUser(request); const secretKey = process.env.STRIPE_SECRET_KEY
  if (!user) return Response.json({ error: 'Authentication is required.' }, { status: 401 })
  if (!secretKey) return Response.json({ error: 'Billing portal is not configured.' }, { status: 503 })
  const { data } = await getSupabaseAdmin().from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).not('stripe_customer_id', 'is', null).limit(1).maybeSingle()
  if (!data?.stripe_customer_id) return Response.json({ error: 'No billing account was found.' }, { status: 404 })
  const session = await new Stripe(secretKey).billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: new URL(request.url).origin })
  return Response.json({ url: session.url })
}
