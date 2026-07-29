import { useEffect, useState } from 'react'
import { downloadFreePdf } from '../services/export/freePdf'
import type { DiscProfile, TraitKey } from '../types/disc'
import { supabase } from '../lib/supabase'
import type { StoredReport } from '../lib/reportStore'
import { useAuth } from '../contexts/AuthContext'

type Subscription = { id: string; plan_type: string; status: string; created_at: string }
type Workspace = { id: string; name: string; created_at: string }
type Branding = { company_name: string | null; logo_url: string | null; brand_color: string | null }
const traitNames: Record<TraitKey, string> = { D: 'Dominance', I: 'Influence', S: 'Steadiness', C: 'Conscientiousness' }

export default function AccountView({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth()
  const [reports, setReports] = useState<StoredReport[]>([]); const [subscriptions, setSubscriptions] = useState<Subscription[]>([]); const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceName, setWorkspaceName] = useState(''); const [message, setMessage] = useState<string | null>(null)
  const [branding, setBranding] = useState<Branding>({ company_name: '', logo_url: '', brand_color: '#8b5e3c' })
  const load = async () => {
    if (!supabase || !user) return
    const [reportResult, subscriptionResult, workspaceResult, brandingResult] = await Promise.all([
      supabase.from('reports').select('id, disc_scores, profile_type, created_at').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('id, plan_type, status, created_at').order('created_at', { ascending: false }),
      supabase.from('workspaces').select('id, name, created_at').order('created_at', { ascending: false }),
      supabase.from('branding').select('company_name, logo_url, brand_color').maybeSingle(),
    ])
    if (reportResult.error || subscriptionResult.error || workspaceResult.error) setMessage('We could not load all account data. Please try again.')
    setReports((reportResult.data ?? []) as StoredReport[]); setSubscriptions((subscriptionResult.data ?? []) as Subscription[]); setWorkspaces((workspaceResult.data ?? []) as Workspace[])
    if (brandingResult.data) setBranding(brandingResult.data as Branding)
  }
  useEffect(() => { void load() }, [user])
  const download = (report: StoredReport) => {
    const profile = report.disc_scores as DiscProfile
    void downloadFreePdf({ profile, primaryTrait: profile.primaryTrait, secondaryTrait: profile.secondaryTrait, generatedAt: new Date(report.created_at).toLocaleDateString(), labels: { brand: 'Northstar DISC', title: 'DISC Assessment Report', summary: 'Your behavioural profile summary', strengths: 'Strengths', generated: 'Generated', traitNames, narrative: profile.narrative, highlights: profile.highlights } })
  }
  const createWorkspace = async () => {
    if (!supabase || !user || !workspaceName.trim()) return
    const { error } = await supabase.from('workspaces').insert({ user_id: user.id, name: workspaceName.trim() })
    if (error) setMessage(error.message); else { setWorkspaceName(''); await load() }
  }
  const openPortal = async () => {
    try { const { data: { session } } = await supabase!.auth.getSession(); const response = await fetch('/api/create-customer-portal', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } }); const body = await response.json(); if (!response.ok || !body.url) throw new Error(body.error ?? 'Customer portal unavailable.'); window.location.assign(body.url) } catch (error) { setMessage(error instanceof Error ? error.message : 'Customer portal unavailable.') }
  }
  const saveBranding = async () => { if (!supabase || !user) return; const { error } = await supabase.from('branding').upsert({ user_id: user.id, ...branding }, { onConflict: 'user_id' }); setMessage(error ? error.message : 'Branding saved.') }
  return <section className="mx-auto w-full max-w-4xl space-y-5 pb-10" aria-labelledby="account-title"><div className="flex flex-wrap items-start justify-between gap-3 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"><div><p className="text-sm text-stone-500">{user?.email}</p><h1 id="account-title" className="mt-1 text-3xl font-semibold text-stone-900">My Reports &amp; Subscriptions</h1></div><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Back to assessment</button><button type="button" onClick={() => void signOut()} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Sign out</button></div></div>{message ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p> : null}<section className="rounded-[2rem] border border-stone-200 bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold text-stone-900">Subscriptions</h2><button type="button" onClick={() => void openPortal()} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Manage billing</button></div><div className="mt-4 space-y-2">{subscriptions.length ? subscriptions.map((item) => <div key={item.id} className="flex justify-between rounded-xl bg-stone-50 p-3 text-sm"><span className="capitalize">{item.plan_type}</span><span className="capitalize text-stone-600">{item.status}</span></div>) : <p className="text-sm text-stone-600">No purchases or subscriptions yet.</p>}</div></section><section className="rounded-[2rem] border border-stone-200 bg-white p-6"><h2 className="text-xl font-semibold text-stone-900">Saved reports</h2><div className="mt-4 space-y-3">{reports.length ? reports.map((report) => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4"><div><p className="font-medium text-stone-900">{report.profile_type} profile</p><p className="text-sm text-stone-600">{new Date(report.created_at).toLocaleString()}</p></div><button type="button" onClick={() => download(report)} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm">Download PDF</button></div>) : <p className="text-sm text-stone-600">Complete an assessment while signed in to keep it here.</p>}</div></section><section className="rounded-[2rem] border border-stone-200 bg-white p-6"><h2 className="text-xl font-semibold text-stone-900">Team workspaces</h2><div className="mt-4 flex gap-2"><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Workspace name" className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm" /><button type="button" onClick={() => void createWorkspace()} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Create</button></div><div className="mt-4 space-y-2">{workspaces.map((item) => <p key={item.id} className="rounded-xl bg-stone-50 p-3 text-sm text-stone-800">{item.name}</p>)}{!workspaces.length ? <p className="text-sm text-stone-600">No team workspaces yet.</p> : null}</div></section><section className="rounded-[2rem] border border-stone-200 bg-white p-6"><h2 className="text-xl font-semibold text-stone-900">Branding</h2><div className="mt-4 grid gap-2 sm:grid-cols-3"><input value={branding.company_name ?? ''} onChange={(event) => setBranding({ ...branding, company_name: event.target.value })} placeholder="Company name" className="rounded-xl border border-stone-200 px-3 py-2 text-sm" /><input value={branding.logo_url ?? ''} onChange={(event) => setBranding({ ...branding, logo_url: event.target.value })} placeholder="Logo URL" className="rounded-xl border border-stone-200 px-3 py-2 text-sm" /><input type="color" value={branding.brand_color ?? '#8b5e3c'} onChange={(event) => setBranding({ ...branding, brand_color: event.target.value })} className="h-10 rounded-xl border border-stone-200 p-1" /></div><button type="button" onClick={() => void saveBranding()} className="mt-3 rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Save branding</button></section></section>
}
