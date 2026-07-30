import type { DiscProfile } from '../types/disc'
import { supabase } from './supabase'

export type StoredReport = { id: string; disc_scores: DiscProfile; profile_type: string; created_at: string }

export async function saveReport(profile: DiscProfile): Promise<string | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('reports').insert({ user_id: user.id, disc_scores: profile, profile_type: `${profile.primaryTrait}${profile.secondaryTrait}` }).select('id').single()
  if (error) throw error
  return data.id
}
