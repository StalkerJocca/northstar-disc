import { useEffect, useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import { getStoredTeamPurchase, startTeamCheckout, verifyTeamPurchase } from '../lib/payments'
import { createWorkspace, inviteUrl, readInvitedMember, type TeamWorkspace } from '../lib/teamInvite'
import type { DiscProfile, TraitKey, TraitScore } from '../types/disc'

type TeamMember = { id: string; name: string; profile: Pick<DiscProfile, 'primaryTrait' | 'secondaryTrait' | 'scores'> }
type Props = { onBack: () => void }
const traits: TraitKey[] = ['D', 'I', 'S', 'C']
const colors: Record<TraitKey, string> = { D: '#c78e69', I: '#d8b24a', S: '#688b6a', C: '#5d6f7d' }
const TEAM_STORAGE_KEY = 'northstar-disc-team-hub-v1'
const WORKSPACE_STORAGE_KEY = 'northstar-disc-team-workspace-v1'

const sampleMembers: TeamMember[] = [
  { id: 'sample-1', name: 'Alex Morgan', profile: { primaryTrait: 'D', secondaryTrait: 'I', scores: [{ trait: 'D', score: 8, percentage: 72 }, { trait: 'I', score: 6, percentage: 61 }, { trait: 'S', score: 3, percentage: 28 }, { trait: 'C', score: 4, percentage: 39 }] } },
  { id: 'sample-2', name: 'Jordan Lee', profile: { primaryTrait: 'S', secondaryTrait: 'C', scores: [{ trait: 'D', score: 3, percentage: 31 }, { trait: 'I', score: 4, percentage: 42 }, { trait: 'S', score: 8, percentage: 74 }, { trait: 'C', score: 7, percentage: 67 }] } },
  { id: 'sample-3', name: 'Sam Patel', profile: { primaryTrait: 'C', secondaryTrait: 'D', scores: [{ trait: 'D', score: 6, percentage: 58 }, { trait: 'I', score: 3, percentage: 29 }, { trait: 'S', score: 5, percentage: 48 }, { trait: 'C', score: 8, percentage: 76 }] } },
  { id: 'sample-4', name: 'Taylor Kim', profile: { primaryTrait: 'I', secondaryTrait: 'S', scores: [{ trait: 'D', score: 4, percentage: 41 }, { trait: 'I', score: 8, percentage: 78 }, { trait: 'S', score: 6, percentage: 63 }, { trait: 'C', score: 3, percentage: 32 }] } },
]

function isProfile(value: unknown): value is TeamMember['profile'] {
  const profile = value as Partial<TeamMember['profile']> | undefined
  return Boolean(profile && traits.includes(profile.primaryTrait as TraitKey) && traits.includes(profile.secondaryTrait as TraitKey) && Array.isArray(profile.scores) && profile.scores.length === 4 && profile.scores.every((score) => {
    const item = score as Partial<TraitScore>
    return traits.includes(item.trait as TraitKey) && typeof item.score === 'number' && typeof item.percentage === 'number'
  }))
}

function parseProfiles(payload: unknown): TeamMember[] {
  const source = Array.isArray(payload) ? payload : ((payload as { members?: unknown })?.members ?? [payload])
  return (Array.isArray(source) ? source : []).flatMap((entry, index) => {
    const item = entry as { name?: unknown; profile?: unknown }
    const profile = isProfile(item.profile) ? item.profile : isProfile(item) ? item : null
    return profile ? [{ id: crypto.randomUUID(), name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Team member ${index + 1}`, profile }] : []
  })
}

export default function TeamDynamicsHub({ onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [members, setMembers] = useState<TeamMember[]>(() => { try { return parseProfiles(JSON.parse(localStorage.getItem(TEAM_STORAGE_KEY) ?? '[]')) } catch { return [] } })
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(() => { try { return JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? 'null') as TeamWorkspace | null } catch { return null } })
  const [workspaceName, setWorkspaceName] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const preview = isPro ? members : members.slice(0, 3)
  const totals = useMemo(() => traits.reduce((result, trait) => ({ ...result, [trait]: preview.length ? Math.round(preview.reduce((sum, member) => sum + (member.profile.scores.find((score) => score.trait === trait)?.percentage ?? 0), 0) / preview.length) : 0 }), {} as Record<TraitKey, number>), [preview])

  useEffect(() => { localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(members)) }, [members])
  useEffect(() => { if (workspace) localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace)) }, [workspace])
  useEffect(() => { const invited = readInvitedMember(); if (invited && isProfile(invited.profile)) { setMembers((current) => current.some((member) => member.name === invited.name && member.profile.primaryTrait === invited.profile.primaryTrait) ? current : [...current, { id: crypto.randomUUID(), name: invited.name, profile: invited.profile }]) } }, [])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const returned = params.get('team_session_id')
    const session = returned ?? getStoredTeamPurchase()
    if (!session) return
    void verifyTeamPurchase(session).then((paid) => {
      if (!paid) return
      setIsPro(true)
      if (returned) { params.delete('team_session_id'); window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`) }
    })
  }, [])

  const importFiles = async (files: FileList | File[]) => {
    setError(null)
    const imported = (await Promise.all(Array.from(files).map(async (file) => {
      if (!file.name.toLowerCase().endsWith('.json')) return []
      try { return parseProfiles(JSON.parse(await file.text())) } catch { return [] }
    }))).flat()
    if (!imported.length) { setError('No valid Northstar DISC profile JSON files were found.'); return }
    setMembers((current) => [...current, ...imported])
  }
  const exportTeamPdf = () => {
    if (!members.length) return
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    doc.setFontSize(24); doc.text('Northstar DISC Team Analysis', 48, 58)
    doc.setFontSize(11); doc.text(`${members.length} team members • Full team analysis`, 48, 82)
    let y = 130
    traits.forEach((trait) => { doc.setFontSize(14); doc.text(`${trait}: ${totals[trait]}%`, 48, y); y += 32 })
    doc.setFontSize(14); doc.text('Team matrix', 48, y + 28)
    members.forEach((member, index) => doc.text(`${member.name} — ${member.profile.primaryTrait}${member.profile.secondaryTrait}`, 58 + (index % 2) * 230, y + 55 + Math.floor(index / 2) * 22))
    doc.save('northstar-disc-team-analysis.pdf')
  }
  const checkout = async () => { setCheckingOut(true); try { await startTeamCheckout() } catch (checkoutError) { setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout is unavailable.'); setCheckingOut(false) } }
  const createInvite = async () => { const next = createWorkspace(workspaceName); next.invites = (workspace?.invites ?? 0) + 1; setWorkspace(next); await navigator.clipboard.writeText(inviteUrl(next)); setInviteCopied(true); window.setTimeout(() => setInviteCopied(false), 2000) }

  return <section className="space-y-6 pb-10">
    <div className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-[0_28px_80px_-36px_rgba(84,56,45,0.28)] sm:p-10">
      <button type="button" onClick={onBack} className="text-sm font-medium text-stone-600 hover:text-stone-900">← Back to assessment</button>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[.28em] text-[#8b5e3c]">Team Dynamics Hub</p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-900">See how your team works together.</h1>
      <p className="mt-3 max-w-2xl text-base leading-8 text-stone-600">Upload saved Northstar DISC profile JSON files to map team balance, communication patterns, and collaboration opportunities.</p>
      <div className="mt-6 rounded-[1.5rem] border border-stone-200 bg-[#fffaf5] p-4"><p className="text-xs font-semibold uppercase tracking-[.22em] text-stone-500">Team workspace</p>{workspace ? <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><strong className="text-stone-800">{workspace.name}</strong><p className="mt-1 text-sm text-stone-600">{members.length} completed profiles · {workspace.invites} invite link{workspace.invites === 1 ? '' : 's'} created</p></div><button type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl(workspace)).then(() => setInviteCopied(true))} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">{inviteCopied ? 'Invite copied' : 'Copy team invite link'}</button></div> : <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Team name" className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => void createInvite()} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">Create Team Workspace</button></div>}</div>
      <input ref={inputRef} type="file" accept="application/json,.json" multiple className="hidden" onChange={(event) => { if (event.target.files) void importFiles(event.target.files); event.target.value = '' }} />
      <div onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void importFiles(event.dataTransfer.files) }} className={`mt-7 rounded-[1.75rem] border-2 border-dashed p-8 text-center transition ${dragging ? 'border-[#8b5e3c] bg-[#fff7f0]' : 'border-stone-300 bg-stone-50'}`}>
        <p className="text-lg font-semibold text-stone-800">Drop one or more profile JSON files here</p><p className="mt-2 text-sm text-stone-600">or choose files from your device</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => inputRef.current?.click()} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Choose JSON files</button><button type="button" onClick={() => setMembers(sampleMembers)} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700">Try with Sample Team Data</button></div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
    {members.length ? <div className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.24em] text-stone-500">{isPro ? 'Full team analysis' : 'Free preview'}</p><h2 className="mt-2 text-2xl font-semibold text-stone-900">Team radar heatmap</h2><p className="mt-2 text-sm text-stone-600">{isPro ? `Viewing all ${members.length} members.` : `Viewing ${preview.length} of ${members.length} members free.`}</p></div>{isPro ? <button type="button" onClick={exportTeamPdf} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Export Team PDF</button> : <button type="button" onClick={() => setPaywallOpen(true)} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Unlock Full Team Analysis & Export</button>}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4"><svg viewBox="0 0 360 300" className="w-full" role="img" aria-label="Team dynamics heatmap"><line x1="30" y1="150" x2="330" y2="150" stroke="#d9c8b7" /><line x1="180" y1="30" x2="180" y2="270" stroke="#d9c8b7" /><text x="315" y="143" fill={colors.D}>D</text><text x="35" y="143" fill={colors.S}>S</text><text x="185" y="35" fill={colors.I}>I</text><text x="185" y="270" fill={colors.C}>C</text>{preview.map((member) => { const score = (trait: TraitKey) => member.profile.scores.find((item) => item.trait === trait)?.percentage ?? 0; const x = 180 + (score('D') - score('S')) * 1.35; const y = 150 - (score('I') - score('C')) * 1.15; return <g key={member.id}><circle cx={x} cy={y} r="14" fill={colors[member.profile.primaryTrait]} stroke="#fff" strokeWidth="2" /><text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">{member.name.slice(0, 2).toUpperCase()}</text></g> })}</svg></div><div className="space-y-3"><div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4"><p className="text-xs uppercase tracking-[.2em] text-stone-500">Team balance</p>{traits.map((trait) => <div key={trait} className="mt-3 flex items-center justify-between"><span>{trait}</span><strong>{totals[trait]}%</strong></div>)}</div><div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4"><p className="text-xs uppercase tracking-[.2em] text-stone-500">{isPro ? 'Advanced matrix insight' : 'Advanced team matrix'}</p><p className="mt-2 text-sm leading-7 text-stone-600">{isPro ? 'Use the complete profile mix to plan communication, decision-making, and conflict support.' : 'Unlock member-to-member interaction insights, the full heatmap, and the export-ready team report.'}</p></div></div></div>
      <div className="mt-5 flex flex-wrap gap-2">{members.map((member) => <span key={member.id} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700">{member.name} · {member.profile.primaryTrait}{member.profile.secondaryTrait}</span>)}</div>
    </div> : null}
    {paywallOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-[2rem] bg-[linear-gradient(135deg,_#fffaf5,_#f1e2d3)] p-6 shadow-2xl"><button type="button" onClick={() => setPaywallOpen(false)} className="float-right rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-600">Close</button><p className="text-xs font-semibold uppercase tracking-[.24em] text-[#8b5e3c]">PRO / TEAM</p><h2 className="mt-3 text-2xl font-semibold text-stone-900">Unlock the full team picture</h2><p className="mt-3 text-sm leading-7 text-stone-700">Analyse every imported profile, reveal the interaction matrix, and export a polished team PDF.</p><ul className="mt-4 space-y-2 text-sm text-stone-700"><li>✓ Unlimited team member analysis</li><li>✓ Advanced collaboration matrix</li><li>✓ Exportable team analysis PDF</li></ul><button type="button" onClick={() => void checkout()} disabled={checkingOut} className="mt-6 w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{checkingOut ? 'Opening secure checkout…' : 'Unlock Team Analysis'}</button></div></div> : null}
  </section>
}
