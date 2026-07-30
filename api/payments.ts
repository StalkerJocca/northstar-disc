import type Stripe from 'stripe'

type Product = 'executive' | 'team' | 'enterprise'
type PaymentPayload = { action?: unknown; product?: unknown; profileCode?: unknown }
type CheckoutConfiguration =
  | { error: Response }
  | { product: Product; config: { priceEnvironment: string; metadataProduct: string; mode: 'payment' | 'subscription' }; secretKey: string; priceId: string }

const products: Record<Product, { priceEnvironment: string; metadataProduct: string; mode: 'payment' | 'subscription' }> = {
  executive: { priceEnvironment: 'STRIPE_EXECUTIVE_REPORT_PRICE_ID', metadataProduct: 'northstar_executive_report', mode: 'payment' },
  team: { priceEnvironment: 'STRIPE_TEAM_ANALYSIS_PRICE_ID', metadataProduct: 'northstar_team_analysis', mode: 'payment' },
  enterprise: { priceEnvironment: 'STRIPE_ENTERPRISE_WHITE_LABEL_PRICE_ID', metadataProduct: 'northstar_enterprise_white_label', mode: 'subscription' },
}

const jsonError = (error: string, status: number, code?: string) => Response.json({ error, ...(code ? { code } : {}) }, { status })

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const body = request.method === 'POST' ? await parseJsonBody(request) : {}
  const action = stringParameter(url.searchParams.get('action')) ?? stringParameter(body.action)
  const product = getProduct(stringParameter(url.searchParams.get('product')) ?? stringParameter(body.product))

  if (action === 'verify') return verifyPurchase(request, url, product)
  if (request.method !== 'POST') return jsonError('Method not allowed.', 405)
  if (action === 'checkout') return createCheckout(request, url, product, body)
  if (action === 'portal') return createCustomerPortal(request)
  return jsonError('Unknown payment action.', 400, 'UNKNOWN_ACTION')
}

async function getStripeClient(secretKey: string): Promise<Stripe> {
  const { default: StripeClient } = await import('stripe')
  return new StripeClient(secretKey)
}

async function authenticate(request: Request) {
  try {
    const { getAuthenticatedUser } = await import('../server/supabase.js')
    return await getAuthenticatedUser(request)
  } catch (error) {
    console.error('Unable to initialize Supabase authentication for payment request.', { error: error instanceof Error ? error.message : 'Unknown error' })
    return null
  }
}

async function parseJsonBody(request: Request): Promise<PaymentPayload> {
  const contentLength = request.headers.get('content-length')
  if (contentLength === '0') return {}
  try {
    const value = await request.json()
    return value && typeof value === 'object' && !Array.isArray(value) ? value as PaymentPayload : {}
  } catch {
    return {}
  }
}

function stringParameter(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getProduct(value: string | null): Product | null {
  return value === 'executive' || value === 'team' || value === 'enterprise' ? value : null
}

function checkoutConfiguration(product: Product | null): CheckoutConfiguration {
  if (!product) {
    console.error('Stripe checkout rejected: invalid or missing product.', { product })
    return { error: jsonError('Stripe configuration missing or invalid Price ID.', 400, 'INVALID_PRODUCT') }
  }
  const config = products[product]
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  const priceId = process.env[config.priceEnvironment]?.trim()
  if (!secretKey || !priceId || !priceId.startsWith('price_')) {
    console.error('Stripe checkout configuration is incomplete or invalid.', {
      product,
      secretKeyConfigured: Boolean(secretKey),
      priceEnvironment: config.priceEnvironment,
      priceIdConfigured: Boolean(priceId),
      priceIdHasExpectedPrefix: Boolean(priceId?.startsWith('price_')),
    })
    return { error: jsonError('Stripe configuration missing or invalid Price ID.', 400, 'STRIPE_CONFIGURATION_INVALID') }
  }
  return { product, config, secretKey, priceId }
}

async function createCheckout(request: Request, url: URL, product: Product | null, body: PaymentPayload): Promise<Response> {
  const configuration = checkoutConfiguration(product)
  if ('error' in configuration) return configuration.error
  const { config, priceId, secretKey } = configuration

  const user = await authenticate(request)
  if (!user) return jsonError('Please sign in before checkout.', 401, 'AUTHENTICATION_REQUIRED')

  const metadata: Record<string, string> = { product: config.metadataProduct, user_id: user.id, price_id: priceId }
  if (product === 'executive') metadata.profileCode = typeof body.profileCode === 'string' && /^[DISC]{2}$/.test(body.profileCode) ? body.profileCode : ''

  try {
    const stripe = await getStripeClient(secretKey)
    const session = await stripe.checkout.sessions.create({
      mode: config.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      success_url: `${url.origin}/checkout/success?product=${product}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/checkout/cancel?product=${product}`,
      metadata,
    })
    if (!session.url) {
      console.error('Stripe checkout session was created without a URL.', { product, sessionId: session.id })
      return jsonError('Stripe did not return a checkout URL.', 500, 'STRIPE_CHECKOUT_URL_MISSING')
    }
    return Response.json({ url: session.url })
  } catch (error) {
    const stripeError = error && typeof error === 'object' ? error as { type?: string; statusCode?: number; requestId?: string } : null
    console.error('Stripe checkout session creation failed.', {
      product,
      priceEnvironment: config.priceEnvironment,
      priceIdConfigured: Boolean(priceId),
      errorType: stripeError?.type ?? (error instanceof Error ? error.name : 'UnknownError'),
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: stripeError?.statusCode,
      requestId: stripeError?.requestId,
    })
    const status = stripeError?.statusCode && stripeError.statusCode >= 400 && stripeError.statusCode < 500 ? 400 : 500
    return jsonError('Unable to create Stripe checkout session. Check the server logs for details.', status, 'STRIPE_CHECKOUT_FAILED')
  }
}

async function verifyPurchase(request: Request, url: URL, product: Product | null): Promise<Response> {
  if (request.method !== 'GET') return Response.json({ paid: false }, { status: 405 })
  const sessionId = url.searchParams.get('session_id'); const secretKey = process.env.STRIPE_SECRET_KEY
  if (!product || !sessionId || !secretKey) return Response.json({ paid: false }, { status: 400 })
  const priceId = process.env[products[product].priceEnvironment]
  if (!priceId) return Response.json({ paid: false }, { status: 400 })
  try {
    const stripe = await getStripeClient(secretKey)
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: product === 'enterprise' ? ['line_items', 'subscription'] : ['line_items'] })
    const hasExpectedPrice = session.line_items?.data.some((item) => item.price?.id === priceId) ?? false
    if (product !== 'enterprise') return Response.json({ paid: session.payment_status === 'paid' && hasExpectedPrice })
    const subscription = typeof session.subscription === 'object' && session.subscription ? session.subscription : null
    return Response.json({ paid: hasExpectedPrice && subscription?.status === 'active' })
  } catch (error) {
    console.error('Stripe purchase verification failed.', { product, error: error instanceof Error ? error.message : 'Unknown error' })
    return Response.json({ paid: false }, { status: 500 })
  }
}

async function createCustomerPortal(request: Request): Promise<Response> {
  const user = await authenticate(request); const secretKey = process.env.STRIPE_SECRET_KEY
  if (!user) return jsonError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED')
  if (!secretKey) return jsonError('Billing portal is not configured.', 503, 'STRIPE_CONFIGURATION_INVALID')
  try {
    const { getSupabaseAdmin } = await import('../server/supabase.js')
    const { data } = await getSupabaseAdmin().from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).not('stripe_customer_id', 'is', null).limit(1).maybeSingle()
    if (!data?.stripe_customer_id) return jsonError('No billing account was found.', 404)
    const stripe = await getStripeClient(secretKey)
    const session = await stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: new URL(request.url).origin })
    return Response.json({ url: session.url })
  } catch (error) {
    console.error('Stripe billing portal creation failed.', { error: error instanceof Error ? error.message : 'Unknown error' })
    return jsonError('Unable to create Stripe billing portal session.', 500, 'STRIPE_PORTAL_FAILED')
  }
}
