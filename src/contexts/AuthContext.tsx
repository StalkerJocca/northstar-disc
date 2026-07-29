import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthValue = { user: User | null; loading: boolean; configured: boolean; signInWithMagicLink: (email: string) => Promise<void>; signInWithGoogle: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(isSupabaseConfigured)
  useEffect(() => { if (!supabase) return; void supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false) }); const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setLoading(false) }); return () => listener.subscription.unsubscribe() }, [])
  const value = useMemo<AuthValue>(() => ({ user, loading, configured: isSupabaseConfigured, signInWithMagicLink: async (email) => { if (!supabase) throw new Error('Authentication is not configured.'); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); if (error) throw error }, signInWithGoogle: async () => { if (!supabase) throw new Error('Authentication is not configured.'); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); if (error) throw error }, signOut: async () => { if (!supabase) return; const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error } }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }
