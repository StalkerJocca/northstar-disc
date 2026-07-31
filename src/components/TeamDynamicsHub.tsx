import { useCallback, useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getEntitlement, startTeamCheckout } from '../lib/payments'
import { supabase } from '../lib/supabase'
import type { DiscProfile, TraitKey } from '../types/disc'

type Team = { id: string; name: string; owner_id: string }
type RosterClient = { id: string; client_name: string; client_email: string; assessment_id: string }
type TeamMember = { id: string; name: string; assessmentId: string; profile: Pick<DiscProfile, 'primaryTrait' | 'secondaryTrait' | 'scores'> }
type Analytics = { team: { id: string; name: string }; members: TeamMember[]; summary: { count: number; quadrantDistribution: Record<TraitKey, number>; naturalBlendMap: Record<TraitKey, number>; adaptedBlendMap: null; synergyPoints: string[]; conflictPoints: string[] } }
type Props = { onBack: () => void }
const traits: TraitKey[] = ['D', 'I', 'S', 'C']

function drawTeamCard(doc: jsPDF, title: string, body: string | string[], x: number, y: number, width: number, height: number, accent = '#8b5e3c') {
  doc.setFillColor('#fffdfa'); doc.setDrawColor('#ded5cc'); doc.roundedRect(x, y, width, height, 12, 12, 'FD')
  doc.setFillColor(accent); doc.roundedRect(x, y, 5, height, 3, 3, 'F')
  doc.setTextColor(accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text('TEAM INSIGHT', x + 16, y + 16)
  doc.setTextColor('#2f241d'); doc.setFontSize(12); doc.text(title, x + 16, y + 31)
  doc.setTextColor('#5f4c3d'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
  const lines = Array.isArray(body) ? body.map((item) => `• ${item}`) : doc.splitTextToSize(body, width - 32)
  doc.text(lines.slice(0, 7), x + 16, y + 48, { lineHeightFactor: 1.45 })
}

export default function TeamDynamicsHub({ onBack }: Props) {
  const { t } = useTranslation(); const { user, configured } = useAuth()
  const [teams, setTeams] = useState<Team[]>([]); const [selectedId, setSelectedId] = useState(''); const [analytics, setAnalytics] = useState<Analytics | null>(null); const [roster, setRoster] = useState<RosterClient[]>([])
  const [name, setName] = useState(''); const [inviteEmail, setInviteEmail] = useState(''); const [message, setMessage] = useState<string | null>(null); const [isPro, setIsPro] = useState(false); const [checkingOut, setCheckingOut] = useState(false)
  const selected = teams.find((team) => team.id === selectedId)
  const load = useCallback(async (teamId?: string) => {
    if (!supabase || !user) return
    const [teamResult, rosterResult] = await Promise.all([
      supabase.from('teams').select('id, name, owner_id').order('created_at'),
      supabase.from('coach_clients').select('id, client_name, client_email, assessment_id').eq('status', 'completed').not('assessment_id', 'is', null).order('client_name'),
    ])
    if (teamResult.error || rosterResult.error) { setMessage(teamResult.error?.message ?? rosterResult.error?.message ?? 'Unable to load teams.'); return }
    const loadedTeams = (teamResult.data ?? []) as Team[]; setTeams(loadedTeams); setRoster((rosterResult.data ?? []) as RosterClient[])
    const nextId = teamId ?? selectedId ?? loadedTeams[0]?.id ?? ''
    if (nextId) { setSelectedId(nextId); await loadAnalytics(nextId) } else setAnalytics(null)
  // selectedId is deliberately read as the current fallback, not a reload trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])
  const loadAnalytics = useCallback(async (teamId: string) => {
    if (!supabase) return
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(`/api/team-analytics?team_id=${encodeURIComponent(teamId)}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
    const body = await response.json().catch(() => ({})) as Analytics & { error?: string }
    if (!response.ok) { setMessage(body.error ?? 'Unable to load team analytics.'); return }
    setAnalytics(body)
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { if (!user) return; void getEntitlement().then((plan) => setIsPro(plan === 'team' || plan === 'enterprise')).catch(() => setIsPro(false)) }, [user])
  useEffect(() => {
    if (!supabase || !user) return
    const token = new URLSearchParams(window.location.search).get('team_invite')
    if (!token) return
    void supabase.rpc('accept_team_invitation', { p_token: token }).then(({ data, error }) => {
      if (error || !data) { setMessage(error?.message ?? 'Unable to accept team invitation.'); return }
      window.history.replaceState({}, '', window.location.pathname)
      void load(data as string)
    })
  }, [load, user])
  const createTeam = async () => {
    if (!supabase || !user || !name.trim()) return
    const { data, error } = await supabase.from('teams').insert({ owner_id: user.id, name: name.trim() }).select('id').single()
    if (error || !data) { setMessage(error?.message ?? 'Unable to create team.'); return }
    setName(''); await load(data.id)
  }
  const addClient = async (client: RosterClient) => {
    if (!supabase || !selectedId) return
    const { error } = await supabase.from('team_members').insert({ team_id: selectedId, assessment_id: client.assessment_id, display_name: client.client_name })
    if (error) setMessage(error.code === '23505' ? 'This client is already in the team.' : error.message); else await loadAnalytics(selectedId)
  }
  const removeMember = async (memberId: string) => { if (!supabase || !selectedId) return; const { error } = await supabase.from('team_members').delete().eq('id', memberId); if (error) setMessage(error.message); else await loadAnalytics(selectedId) }
  const inviteManager = async () => {
    if (!supabase || !user || !selectedId || !/^\S+@\S+\.\S+$/.test(inviteEmail)) { setMessage('Enter a valid co-manager email.'); return }
    const { data, error } = await supabase.from('team_invitations').insert({ team_id: selectedId, invited_by: user.id, invited_email: inviteEmail.trim().toLowerCase() }).select('token').single()
    if (error || !data) { setMessage(error?.message ?? 'Unable to create invitation.'); return }
    const url = `${window.location.origin}/?team_hub=1&team_invite=${data.token}`
    await navigator.clipboard.writeText(url); setInviteEmail(''); setMessage('Co-manager invitation link copied. Share it with the invited email address.')
  }
  const exportPdf = () => {
    if (!analytics) return
    const doc = new jsPDF({ unit: 'pt', format: 'a4' }); const accent = '#8b5e3c'; const primary = traits.reduce((best, trait) => analytics.summary.naturalBlendMap[trait] > analytics.summary.naturalBlendMap[best] ? trait : best, 'D' as TraitKey); const values = traits.map((trait) => analytics.summary.naturalBlendMap[trait]); const variance = Math.max(...values) - Math.min(...values)
    doc.setFillColor(accent); doc.rect(42, 42, 511, 7, 'F'); doc.setTextColor(accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('NORTHSTAR DISC · CONFIDENTIAL TEAM BRIEF', 42, 70); doc.setTextColor('#2f241d'); doc.setFontSize(25); doc.text(`${analytics.team.name} Team Report`, 42, 101); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor('#5f4c3d'); doc.text(`${analytics.summary.count} saved members · Executive team dynamics analysis`, 42, 120)
    ;[['Primary team archetype', `${primary}-led team`], ['Dominant distribution', `${analytics.summary.quadrantDistribution[primary]} primary ${primary} profiles`], ['Style variance score', `${variance}% spread`]].forEach(([label, value], index) => { const x = 42 + index * 174; doc.setFillColor('#f7efe6'); doc.setDrawColor('#ded5cc'); doc.roundedRect(x, 144, 162, 64, 11, 11, 'FD'); doc.setTextColor(accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(label.toUpperCase(), x + 12, 160); doc.setTextColor('#2f241d'); doc.setFontSize(15); doc.text(value, x + 12, 184) })
    drawTeamCard(doc, 'Team strengths', analytics.summary.synergyPoints.length ? analytics.summary.synergyPoints : ['Complementary DISC styles create broader problem-solving capacity.'], 42, 228, 511, 105, accent)
    drawTeamCard(doc, 'Collective blind spots', analytics.summary.conflictPoints.length ? analytics.summary.conflictPoints : ['No dominant conflict pattern detected; keep checking assumptions across styles.'], 42, 348, 511, 105, '#a85f48')
    drawTeamCard(doc, 'Collaboration friction risk', variance > 35 ? 'Higher style variance can create pace and communication friction. Agree decision rights and response-time expectations early.' : 'The team has a relatively aligned behavioral pace. Invite constructive dissent to avoid groupthink.', 42, 468, 511, 95, '#c78e69')
    doc.addPage(); doc.setFillColor(accent); doc.rect(42, 42, 511, 7, 'F'); doc.setTextColor(accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('NORTHSTAR DISC · MANAGER PLAYBOOK', 42, 70); doc.setTextColor('#2f241d'); doc.setFontSize(23); doc.text('How to Lead This Team', 42, 101)
    drawTeamCard(doc, 'Leadership approach', `Lead the ${primary}-led team with clear outcomes, visible ownership, and deliberate invitations for less dominant styles to shape decisions.`, 42, 130, 511, 105, accent)
    drawTeamCard(doc, 'Recommended meeting framework', ['Start with the decision and success criteria.', 'Use a short round-robin for each DISC perspective.', 'Close with named owners, deadlines, and communication cadence.'], 42, 250, 511, 125, '#c78e69')
    drawTeamCard(doc, 'Feedback framework', 'Frame feedback around observable outcomes, match the level of detail to the recipient’s style, and agree on one practical next step with a review date.', 42, 390, 511, 105, accent)
    drawTeamCard(doc, 'Team roster', analytics.members.map((member) => `${member.name} — ${member.profile.primaryTrait}${member.profile.secondaryTrait}`).join('\n'), 42, 510, 511, 170, '#5d6f7d')
    doc.save(`${analytics.team.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'team'}-executive-analysis.pdf`)
  }
  const availableRoster = useMemo(() => roster.filter((client) => !analytics?.members.some((member) => member.assessmentId === client.assessment_id)), [analytics, roster])
  if (!configured || !user) return <section className="rounded-[2rem] border border-stone-200 bg-white p-6 text-sm text-stone-600">Sign in to create and manage persistent teams.</section>
  return <section className="space-y-5 pb-10"><div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={onBack} className="text-sm text-stone-600">← {t('teamHub.back')}</button><button type="button" onClick={exportPdf} disabled={!analytics?.members.length} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{t('teamHub.export')}</button></div><div className="grid gap-5 lg:grid-cols-[260px_1fr]"><aside className="rounded-[1.5rem] border border-stone-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[.2em] text-stone-500">Saved teams</p><div className="mt-3 space-y-2">{teams.map((team) => <button key={team.id} type="button" onClick={() => { setSelectedId(team.id); void loadAnalytics(team.id) }} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${team.id === selectedId ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-700'}`}>{team.name}</button>)}</div><div className="mt-4 border-t border-stone-200 pt-4"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New team name" className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" /><button type="button" onClick={() => void createTeam()} className="mt-2 w-full rounded-full bg-stone-900 px-3 py-2 text-sm text-white">Create team</button></div></aside><main className="rounded-[2rem] border border-stone-200 bg-white p-5 sm:p-7">{selected ? <><p className="text-xs font-semibold uppercase tracking-[.24em] text-[#8b5e3c]">{t('teamHub.eyebrow')}</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">{selected.name}</h1><p className="mt-2 text-sm text-stone-600">Saved members always reference their source assessment.</p>{message ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p> : null}<div className="mt-5 grid gap-4 md:grid-cols-2"><section className="rounded-[1.5rem] bg-stone-50 p-4"><p className="text-sm font-semibold text-stone-800">Add completed client profiles</p><div className="mt-3 space-y-2">{availableRoster.map((client) => <button key={client.id} type="button" onClick={() => void addClient(client)} className="flex w-full justify-between rounded-xl bg-white p-3 text-left text-sm"><span>{client.client_name}<small className="block text-stone-500">{client.client_email}</small></span><span>＋</span></button>)}{!availableRoster.length ? <p className="text-sm text-stone-500">No additional completed client profiles.</p> : null}</div></section><section className="rounded-[1.5rem] bg-[#fffaf5] p-4"><p className="text-sm font-semibold text-stone-800">Invite a co-manager</p><p className="mt-1 text-xs text-stone-600">The link can only be accepted by this email address.</p><input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" placeholder="coach@example.com" className="mt-3 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" /><button type="button" onClick={() => void inviteManager()} className="mt-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm">Copy invitation link</button></section></div>{analytics ? <><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{traits.map((trait) => <div key={trait} className="rounded-2xl border border-stone-200 p-4"><p className="text-xs text-stone-500">{trait} natural blend</p><strong className="text-2xl text-stone-900">{analytics.summary.naturalBlendMap[trait]}%</strong><p className="text-xs text-stone-500">{analytics.summary.quadrantDistribution[trait]} primary</p></div>)}</div><div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm"><strong>Synergy</strong>{analytics.summary.synergyPoints.map((point) => <p key={point} className="mt-2">{point}</p>)}</div><div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm"><strong>Watch-outs</strong>{analytics.summary.conflictPoints.length ? analytics.summary.conflictPoints.map((point) => <p key={point} className="mt-2">{point}</p>) : <p className="mt-2">No material imbalance identified.</p>}</div></div><div className="mt-5 rounded-[1.5rem] border border-stone-200 p-4"><p className="text-sm font-semibold">Saved members</p>{analytics.members.map((member) => <div key={member.id} className="mt-2 flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm"><span>{member.name} · {member.profile.primaryTrait}{member.profile.secondaryTrait}</span><button type="button" onClick={() => void removeMember(member.id)} className="text-stone-500">Remove</button></div>)}</div></> : null}{!isPro ? <div className="mt-5 rounded-[1.5rem] bg-stone-900 p-4 text-white"><p className="text-sm">Unlock full team analytics and exports.</p><button type="button" disabled={checkingOut} onClick={() => { setCheckingOut(true); void startTeamCheckout().catch((error) => { setMessage(error instanceof Error ? error.message : 'Checkout unavailable.'); setCheckingOut(false) }) }} className="mt-3 rounded-full bg-white px-4 py-2 text-sm text-stone-900">{checkingOut ? t('teamHub.redirecting') : t('teamHub.unlock')}</button></div> : null}</> : <div className="text-center text-sm text-stone-600">Create your first persistent team to begin.</div>}</main></div></section>
}
