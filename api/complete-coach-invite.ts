import { getAuthenticatedUser, getSupabaseAdmin } from './supabase.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const user = await getAuthenticatedUser(request)
  if (!user?.email) return Response.json({ error: 'Authentication is required.' }, { status: 401 })
  const body = await request.json().catch(() => null) as { inviteToken?: unknown; assessmentId?: unknown } | null
  if (!body || typeof body.inviteToken !== 'string' || typeof body.assessmentId !== 'string') return Response.json({ error: 'Invalid invitation completion request.' }, { status: 400 })
  const admin = getSupabaseAdmin()
  const { data: invite, error: inviteError } = await admin.from('coach_clients').select('id, client_email, status').eq('invite_token', body.inviteToken).maybeSingle()
  if (inviteError || !invite) return Response.json({ error: 'Invitation not found.' }, { status: 404 })
  if (invite.client_email.trim().toLowerCase() !== user.email.trim().toLowerCase()) return Response.json({ error: 'Please sign in with the email address that received this invitation.' }, { status: 403 })
  const { data: report, error: reportError } = await admin.from('reports').select('id').eq('id', body.assessmentId).eq('user_id', user.id).maybeSingle()
  if (reportError || !report) return Response.json({ error: 'Assessment not found.' }, { status: 404 })
  const { error } = await admin.from('coach_clients').update({ status: 'completed', assessment_id: report.id, completed_at: new Date().toISOString() }).eq('id', invite.id)
  if (error) return Response.json({ error: 'Unable to link assessment.' }, { status: 500 })
  return Response.json({ ok: true })
}
