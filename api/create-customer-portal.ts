import Stripe from 'stripe'
import { getAuthenticatedUser, getSupabaseAdmin } from './supabase.js'
export default async function handler(request: Request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const user = await getAuthenticatedUser(request); const secretKey = process.env.STRIPE_SECRET_KEY
  if (!user || !secretKey) return Response.json({ error: 'Authentication is required.' }, { status: 401 })
  const { data } = await getSupabaseAdmin().from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).not('stripe_customer_id', 'is', null).limit(1).maybeSingle()
  if (!data?.stripe_customer_id) return Response.json({ error: 'No billing account was found.' }, { status: 404 })
  const session = await new Stripe(secretKey).billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: new URL(request.url).origin })
  return Response.json({ url: session.url })
}
