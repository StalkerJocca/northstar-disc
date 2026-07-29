import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
// Supabase calls this value an "anon key" in legacy projects and a
// "publishable key" in newer projects. Support both Vercel variable names.
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim()

export const supabase = url && key ? createClient(url, key) : null
export const isSupabaseConfigured = Boolean(supabase)
