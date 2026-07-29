import Stripe from 'stripe'
import { getSupabaseAdmin } from '../supabase'

const planForPrice = (priceId: string | null) => priceId === process.env.STRIPE_ENTERPRISE_WHITE_LABEL_PRICE_ID ? 'enterprise' : priceId === process.env.STRIPE_TEAM_ANALYSIS_PRICE_ID ? 'team' : 'executive'
const entitlementFor = (plan: string, status: string) => status === 'active' || status === 'paid' || status === 'trialing' ? plan : 'free'

async function refreshEntitlement(userId: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('subscriptions').select('plan_type, status').eq('user_id', userId)
  if (error) throw error
  const rank: Record<string, number> = { executive: 1, team: 2, enterprise: 3 }
  const eligible = (data ?? []).filter((item) => entitlementFor(item.plan_type, item.status) !== 'free').sort((a, b) => rank[b.plan_type] - rank[a.plan_type])[0]
  const { error: userError } = await admin.from('users').update({ entitlement_plan: eligible?.plan_type ?? 'free', entitlement_status: eligible?.status ?? 'inactive' }).eq('id', userId)
  if (userError) throw userError
}

async function syncSubscription(input: { userId: string; customerId: string | null; subscriptionId: string | null; sessionId?: string; priceId: string | null; status: string }) {
  const admin = getSupabaseAdmin(); const plan = planForPrice(input.priceId)
  const { error } = await admin.from('subscriptions').upsert({ user_id: input.userId, stripe_customer_id: input.customerId, stripe_subscription_id: input.subscriptionId, stripe_checkout_session_id: input.sessionId ?? null, plan_type: plan, status: input.status, updated_at: new Date().toISOString() }, { onConflict: input.subscriptionId ? 'stripe_subscription_id' : 'stripe_checkout_session_id' })
  if (error) throw error
  await refreshEntitlement(input.userId)
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY; const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; const signature = request.headers.get('stripe-signature')
  if (!secretKey || !webhookSecret || !signature) return Response.json({ error: 'Webhook configuration is missing.' }, { status: 400 })
  let event: Stripe.Event
  try { event = new Stripe(secretKey).webhooks.constructEvent(await request.text(), signature, webhookSecret) } catch { return Response.json({ error: 'Invalid Stripe signature.' }, { status: 400 }) }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session; const userId = session.client_reference_id ?? session.metadata?.user_id
      if (userId) await syncSubscription({ userId, customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null, subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null, sessionId: session.id, priceId: session.metadata?.price_id ?? null, status: session.mode === 'subscription' ? 'active' : 'paid' })
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription; const admin = getSupabaseAdmin(); const { data } = await admin.from('subscriptions').select('user_id').eq('stripe_subscription_id', subscription.id).maybeSingle()
      if (data?.user_id) await syncSubscription({ userId: data.user_id, customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id, subscriptionId: subscription.id, priceId: subscription.items.data[0]?.price.id ?? null, status: subscription.status })
    }
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Webhook processing failed.' }, { status: 500 }) }
  return Response.json({ received: true })
}
