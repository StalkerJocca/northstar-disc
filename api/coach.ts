import Stripe from 'stripe'
import { getAuthenticatedUser, getSupabaseAdmin } from '../server/supabase.js'
import { createNodeHandler } from '../server/vercel.js'

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const action = new URL(request.url).searchParams.get('action'); const user = await getAuthenticatedUser(request)
  if (!user) return Response.json({ error: 'Authentication is required.' }, { status: 401 })
  if (action === 'credits-checkout') {
    const secretKey = process.env.STRIPE_SECRET_KEY; const priceId = process.env.STRIPE_COACH_CREDIT_PACK_PRICE_ID
    if (!secretKey || !priceId) return Response.json({ error: 'Coach credit checkout is not configured.' }, { status: 503 })
    const credits = Math.max(1, Number.parseInt(process.env.STRIPE_COACH_CREDIT_PACK_SIZE ?? '5', 10) || 5); const origin = new URL(request.url).origin
    const session = await new Stripe(secretKey).checkout.sessions.create({ mode: 'payment', line_items: [{ price: priceId, quantity: 1 }], client_reference_id: user.id, success_url: `${origin}/workspace?credits_checkout=success`, cancel_url: `${origin}/workspace?credits_checkout=cancel`, metadata: { product: 'northstar_coach_credits', user_id: user.id, credits: String(credits), price_id: priceId } })
    return Response.json({ url: session.url })
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const admin = getSupabaseAdmin()
  if (action === 'invite') {
    const name = typeof body?.clientName === 'string' ? body.clientName.trim().slice(0, 120) : ''; const email = typeof body?.clientEmail === 'string' ? body.clientEmail.trim().toLowerCase() : ''
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: 'Enter a valid client name and email address.' }, { status: 400 })
    const { data: consumed, error: creditError } = await admin.rpc('consume_coach_invite_credit', { p_user_id: user.id })
    if (creditError) return Response.json({ error: 'Unable to validate invite credits.' }, { status: 500 }); if (!consumed) return Response.json({ error: 'No invite credits remain.', code: 'NO_CREDITS' }, { status: 402 })
    const { data, error } = await admin.from('coach_clients').insert({ user_id: user.id, client_name: name, client_email: email }).select('id, invite_token').single()
    if (error || !data) {
      const { data: account } = await admin.from('users').select('coach_invite_credits').eq('id', user.id).single()
      await admin.from('users').update({ coach_invite_credits: (account?.coach_invite_credits ?? 0) + 1 }).eq('id', user.id)
      return Response.json({ error: 'Unable to create invitation. Your credit has been restored.' }, { status: 500 })
    }
    const { data: account } = await admin.from('users').select('coach_invite_credits').eq('id', user.id).single()
    return Response.json({ clientId: data.id, inviteToken: data.invite_token, creditsRemaining: account?.coach_invite_credits ?? 0 })
  }
  if (action === 'complete') {
    if (typeof body?.inviteToken !== 'string' || typeof body.assessmentId !== 'string' || !user.email) return Response.json({ error: 'Invalid invitation completion request.' }, { status: 400 })
    const { data: invite } = await admin.from('coach_clients').select('id, client_email, status, expires_at').eq('invite_token', body.inviteToken).maybeSingle()
    if (!invite) return Response.json({ error: 'Invitation not found.' }, { status: 404 })
    if (invite.status !== 'invited' || new Date(invite.expires_at).getTime() <= Date.now()) return Response.json({ error: 'This invitation has expired or was cancelled.' }, { status: 409 })
    if (invite.client_email.trim().toLowerCase() !== user.email.trim().toLowerCase()) return Response.json({ error: 'Please sign in with the email address that received this invitation.' }, { status: 403 })
    const { data: report } = await admin.from('reports').select('id').eq('id', body.assessmentId).eq('user_id', user.id).maybeSingle()
    if (!report) return Response.json({ error: 'Assessment not found.' }, { status: 404 })
    const { error } = await admin.from('coach_clients').update({ status: 'completed', assessment_id: report.id, completed_at: new Date().toISOString() }).eq('id', invite.id)
    return error ? Response.json({ error: 'Unable to link assessment.' }, { status: 500 }) : Response.json({ ok: true })
  }
  if (action === 'revoke') {
    if (typeof body?.clientId !== 'string') return Response.json({ error: 'clientId is required.' }, { status: 400 })
    const { data: refunded, error } = await admin.rpc('revoke_coach_invite', { p_user_id: user.id, p_client_id: body.clientId })
    if (error) return Response.json({ error: 'Unable to revoke invitation.' }, { status: 500 })
    return refunded ? Response.json({ revoked: true, refunded: true }) : Response.json({ error: 'Only active invitations can be cancelled.' }, { status: 409 })
  }
  if (action === 'client-update') {
    if (typeof body?.clientId !== 'string') return Response.json({ error: 'clientId is required.' }, { status: 400 })
    const update: Record<string, unknown> = {}
    if (typeof body.privateNotes === 'string') update.private_notes = body.privateNotes.slice(0, 5000)
    if (Array.isArray(body.tags) && body.tags.every((tag) => typeof tag === 'string')) update.tags = body.tags.map((tag) => tag.trim().slice(0, 60)).filter(Boolean).slice(0, 20)
    if (body.archived === true) update.archived_at = new Date().toISOString()
    if (body.archived === false) update.archived_at = null
    const { error } = await admin.from('coach_clients').update(update).eq('id', body.clientId).eq('user_id', user.id)
    return error ? Response.json({ error: 'Unable to update client.' }, { status: 500 }) : Response.json({ ok: true })
  }
  if (action === 'client-delete') {
    if (typeof body?.clientId !== 'string') return Response.json({ error: 'clientId is required.' }, { status: 400 })
    const { error } = await admin.from('coach_clients').delete().eq('id', body.clientId).eq('user_id', user.id)
    return error ? Response.json({ error: 'Unable to delete client.' }, { status: 500 }) : Response.json({ ok: true })
  }
  return Response.json({ error: 'Unknown coach action.' }, { status: 400 })
}

export default createNodeHandler(handleRequest)
