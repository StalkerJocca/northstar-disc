import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase server configuration is missing.')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}
export async function getAuthenticatedUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  try { const { data, error } = await getSupabaseAdmin().auth.getUser(token); return error ? null : data.user } catch { return null }
}
