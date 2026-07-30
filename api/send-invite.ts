import { getAuthenticatedUser, getSupabaseAdmin } from '../server/supabase.js'
import { createNodeHandler } from '../server/vercel.js'

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const user = await getAuthenticatedUser(request); const body = await request.json().catch(() => ({})) as { clientId?: unknown }
  if (!user) return Response.json({ error: 'Authentication is required.' }, { status: 401 })
  if (typeof body.clientId !== 'string') return Response.json({ error: 'clientId is required.' }, { status: 400 })
  const admin = getSupabaseAdmin(); const { data: client, error } = await admin.from('coach_clients').select('id, client_name, client_email, invite_token, expires_at, status').eq('id', body.clientId).eq('user_id', user.id).maybeSingle()
  if (error || !client) return Response.json({ error: 'Client invitation not found.' }, { status: 404 })
  if (client.status !== 'invited' || new Date(client.expires_at).getTime() <= Date.now()) return Response.json({ error: 'Only active invitations can be sent.' }, { status: 409 })
  const key = process.env.RESEND_API_KEY; const from = process.env.INVITE_EMAIL_FROM
  if (!key || !from) return Response.json({ error: 'Invitation email is not configured.' }, { status: 503 })
  const { data: branding } = await admin.from('branding').select('company_name, logo_url, brand_color').eq('user_id', user.id).maybeSingle()
  const origin = process.env.APP_URL ?? new URL(request.url).origin; const link = `${new URL(origin).origin}/?coach_invite=${client.invite_token}`
  const brand = branding?.company_name?.trim() || 'Northstar DISC'; const color = branding?.brand_color || '#8b5e3c'
  const html = `<main style="font-family:Arial,sans-serif;color:#292524;max-width:600px;margin:auto"><h1 style="color:${color}">${brand}</h1><p>Hi ${escapeHtml(client.client_name)},</p><p>You have been invited to complete a confidential DISC assessment.</p><p><a href="${link}" style="display:inline-block;background:${color};color:white;padding:12px 20px;border-radius:24px;text-decoration:none">Start assessment</a></p><p>This invitation expires on ${new Date(client.expires_at).toLocaleDateString()}.</p></main>`
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [client.client_email], subject: `${brand}: your DISC assessment invitation`, html }) })
  if (!response.ok) { console.error('Resend invitation failed', await response.text()); return Response.json({ error: 'Email delivery failed. You can still copy the invitation link.' }, { status: 502 }) }
  const { error: updateError } = await admin.from('coach_clients').update({ invite_sent_at: new Date().toISOString(), invite_send_count: await incrementSendCount(admin, client.id) }).eq('id', client.id)
  if (updateError) console.error('Unable to record invitation delivery', updateError)
  return Response.json({ sent: true })
}
async function incrementSendCount(admin: ReturnType<typeof getSupabaseAdmin>, clientId: string) { const { data } = await admin.from('coach_clients').select('invite_send_count').eq('id', clientId).single(); return (data?.invite_send_count ?? 0) + 1 }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character) }
export default createNodeHandler(handleRequest)
