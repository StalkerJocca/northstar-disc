import { getAuthenticatedUser, getSupabaseAdmin } from './supabase.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const user = await getAuthenticatedUser(request)
  const body = await request.json().catch(() => null) as { clientName?: unknown; clientEmail?: unknown } | null
  if (!user || !body || typeof body.clientName !== 'string' || typeof body.clientEmail !== 'string') return Response.json({ error: 'A client name and email are required.' }, { status: 400 })
  const clientName = body.clientName.trim().slice(0, 120); const clientEmail = body.clientEmail.trim().toLowerCase()
  if (!clientName || !/^\S+@\S+\.\S+$/.test(clientEmail)) return Response.json({ error: 'Enter a valid client name and email address.' }, { status: 400 })
  const admin = getSupabaseAdmin()
  const { data: consumed, error: creditError } = await admin.rpc('consume_coach_invite_credit', { p_user_id: user.id })
  if (creditError) return Response.json({ error: 'Unable to validate invite credits.' }, { status: 500 })
  if (!consumed) return Response.json({ error: 'No invite credits remain.', code: 'NO_CREDITS' }, { status: 402 })
  const { data, error } = await admin.from('coach_clients').insert({ user_id: user.id, client_name: clientName, client_email: clientEmail }).select('invite_token').single()
  if (error || !data) {
    const { data: account } = await admin.from('users').select('coach_invite_credits').eq('id', user.id).single()
    await admin.from('users').update({ coach_invite_credits: (account?.coach_invite_credits ?? 0) + 1 }).eq('id', user.id)
    return Response.json({ error: 'Unable to create invitation. Your credit has been restored.' }, { status: 500 })
  }
  const { data: account } = await admin.from('users').select('coach_invite_credits').eq('id', user.id).single()
  return Response.json({ inviteToken: data.invite_token, creditsRemaining: account?.coach_invite_credits ?? 0 })
}
