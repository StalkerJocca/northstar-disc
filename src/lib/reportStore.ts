import type { DiscProfile } from '../types/disc'
import { supabase } from './supabase'

export type StoredReport = { id: string; disc_scores: DiscProfile; profile_type: string; created_at: string }

export async function saveReport(profile: DiscProfile) {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('reports').insert({ user_id: user.id, disc_scores: profile, profile_type: `${profile.primaryTrait}${profile.secondaryTrait}` })
  if (error) throw error
}
