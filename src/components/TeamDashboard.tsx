import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { jsPDF } from 'jspdf'
import type { DiscProfile, TraitKey, TraitScore } from '../types/disc'

type TeamMember = {
  id: string
  name: string
  profile: Pick<DiscProfile, 'primaryTrait' | 'secondaryTrait' | 'scores'>
}

type TeamDashboardProps = {
  currentProfile: DiscProfile | null
}

const STORAGE_KEY = 'northstar-disc-team-v1'
const traits: TraitKey[] = ['D', 'I', 'S', 'C']
const colors: Record<TraitKey, string> = { D: '#c78e69', I: '#d8b24a', S: '#688b6a', C: '#5d6f7d' }

const validScores = (value: unknown): value is TraitScore[] => Array.isArray(value) && value.length === 4 && value.every((score) => {
  const item = score as Partial<TraitScore>
  return traits.includes(item.trait as TraitKey) && typeof item.score === 'number' && typeof item.percentage === 'number'
})

const isProfile = (value: unknown): value is TeamMember['profile'] => {
  const profile = value as Partial<TeamMember['profile']> | undefined
  return Boolean(profile && traits.includes(profile.primaryTrait as TraitKey) && traits.includes(profile.secondaryTrait as TraitKey) && validScores(profile.scores))
}

const readStoredTeam = (): TeamMember[] => {
  if (typeof window === 'undefined') return []
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    return Array.isArray(saved) ? saved.filter((member): member is TeamMember => {
      const item = member as Partial<TeamMember>
      return typeof item.id === 'string' && typeof item.name === 'string' && isProfile(item.profile)
    }) : []
  } catch {
    return []
  }
}

function scoreFor(member: TeamMember, trait: TraitKey) {
  return member.profile.scores.find((score) => score.trait === trait)?.percentage ?? 0
}

function profileCode(member: TeamMember) {
  return `${member.profile.primaryTrait}${member.profile.secondaryTrait}`
}

export default function TeamDashboard({ currentProfile }: TeamDashboardProps) {
  const { t } = useTranslation()
  const fileInput = useRef<HTMLInputElement>(null)
  const [members, setMembers] = useState<TeamMember[]>(readStoredTeam)
  const [memberName, setMemberName] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [selectedA, setSelectedA] = useState('')
  const [selectedB, setSelectedB] = useState('')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members))
  }, [members])

  useEffect(() => {
    if (!selectedA && members[0]) setSelectedA(members[0].id)
    if (!selectedB && members[1]) setSelectedB(members[1].id)
  }, [members, selectedA, selectedB])

  const totals = useMemo(() => traits.reduce((acc, trait) => {
    acc[trait] = members.length ? Math.round(members.reduce((sum, member) => sum + scoreFor(member, trait), 0) / members.length) : 0
    return acc
  }, {} as Record<TraitKey, number>), [members])
  const strongest = [...traits].sort((a, b) => totals[b] - totals[a])
  const lowest = strongest[strongest.length - 1]
  const memberA = members.find((member) => member.id === selectedA)
  const memberB = members.find((member) => member.id === selectedB)

  const addCurrentProfile = () => {
    if (!currentProfile) return
    const name = memberName.trim() || t('teamDashboard.currentProfile')
    setMembers((team) => [...team, { id: crypto.randomUUID(), name, profile: currentProfile }])
    setMemberName('')
  }

  const importProfiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportError(null)
    try {
      const payload = JSON.parse(await file.text()) as unknown
      const rawProfiles = Array.isArray(payload) ? payload : (payload as { members?: unknown; profile?: unknown }).members ?? [payload]
      const imported = (Array.isArray(rawProfiles) ? rawProfiles : []).flatMap((entry, index) => {
        const raw = entry as { name?: unknown; profile?: unknown; primaryTrait?: unknown; secondaryTrait?: unknown; scores?: unknown }
        const profile = isProfile(raw.profile) ? raw.profile : isProfile(raw) ? raw : null
        return profile ? [{ id: crypto.randomUUID(), name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : t('teamDashboard.memberNumber', { number: index + 1 }), profile }] : []
      })
      if (!imported.length) throw new Error('invalid')
      setMembers((team) => [...team, ...imported])
    } catch {
      setImportError(t('teamDashboard.importError'))
    } finally {
      event.target.value = ''
    }
  }

  const exportSummary = () => {
    if (!members.length) return
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    doc.setFillColor(255, 250, 245)
    doc.rect(0, 0, 595, 842, 'F')
    doc.setTextColor(47, 36, 29)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.text(t('teamDashboard.pdfTitle'), 48, 58)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(95, 76, 61)
    doc.text(t('teamDashboard.pdfSubtitle', { count: members.length }), 48, 80)
    let y = 130
    traits.forEach((trait) => {
      doc.setTextColor(47, 36, 29)
      doc.setFont('helvetica', 'bold')
      doc.text(`${t(`traits.${trait}`)}  ${totals[trait]}%`, 48, y)
      doc.setFillColor(234, 224, 214)
      doc.roundedRect(190, y - 12, 300, 12, 6, 6, 'F')
      const hex = colors[trait].replace('#', '')
      doc.setFillColor(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16))
      doc.roundedRect(190, y - 12, 3 * totals[trait], 12, 6, 6, 'F')
      y += 40
    })
    doc.setFillColor(247, 239, 230)
    doc.roundedRect(48, 305, 499, 82, 14, 14, 'F')
    doc.setTextColor(47, 36, 29)
    doc.setFont('helvetica', 'bold')
    doc.text(t('teamDashboard.balanceTitle'), 66, 335)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(t('teamDashboard.balanceSummary', { primary: t(`traits.${strongest[0]}`), primaryValue: totals[strongest[0]], secondary: t(`traits.${strongest[1]}`), secondaryValue: totals[strongest[1]] }), 66, 357)
    doc.text(t('teamDashboard.riskSummary', { trait: t(`traits.${lowest}`), risk: t(`teamDashboard.risks.${lowest}`) }), 66, 375)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(t('teamDashboard.members'), 48, 435)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    members.slice(0, 18).forEach((member, index) => doc.text(`${member.name} — ${profileCode(member)}`, 58 + (index % 2) * 240, 462 + Math.floor(index / 2) * 24))
    doc.save('northstar-disc-team-summary.pdf')
  }

  return (
    <section className="executive-card mt-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{t('teamDashboard.eyebrow')}</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-800">{t('teamDashboard.title')}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">{t('teamDashboard.description')}</p>
        </div>
        <button type="button" onClick={exportSummary} disabled={!members.length} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{t('teamDashboard.export')}</button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-stone-200 bg-stone-50 p-3">
        <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder={t('teamDashboard.namePlaceholder')} className="min-w-48 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700" />
        <button type="button" onClick={addCurrentProfile} disabled={!currentProfile} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:opacity-50">{t('teamDashboard.addCurrent')}</button>
        <button type="button" onClick={() => fileInput.current?.click()} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700">{t('teamDashboard.import')}</button>
        <input ref={fileInput} type="file" accept="application/json,.json" onChange={importProfiles} className="hidden" />
      </div>
      {importError ? <p className="mt-2 text-sm text-red-700">{importError}</p> : null}

      {members.length ? <>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-stone-200 bg-[radial-gradient(circle_at_top,_#fffaf6,_#f6ebe0)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t('teamDashboard.heatmap')}</p>
            <svg viewBox="0 0 360 300" className="mt-2 h-72 w-full" role="img" aria-label={t('teamDashboard.heatmap')}>
              <line x1="180" y1="20" x2="180" y2="280" stroke="#d8c6b6" strokeDasharray="4 4" /><line x1="30" y1="150" x2="330" y2="150" stroke="#d8c6b6" strokeDasharray="4 4" />
              <text x="320" y="143" fill={colors.D} fontSize="12">D</text><text x="34" y="143" fill={colors.S} fontSize="12">S</text><text x="185" y="32" fill={colors.I} fontSize="12">I</text><text x="185" y="276" fill={colors.C} fontSize="12">C</text>
              {members.map((member) => {
                const x = 180 + (scoreFor(member, 'D') - scoreFor(member, 'S')) * 1.35
                const y = 150 - (scoreFor(member, 'I') - scoreFor(member, 'C')) * 1.15
                return <g key={member.id}><circle cx={x} cy={y} r="12" fill={colors[member.profile.primaryTrait]} fillOpacity="0.86" stroke="#fff" strokeWidth="2" /><text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">{member.name.slice(0, 2).toUpperCase()}</text></g>
              })}
            </svg>
            <div className="flex flex-wrap gap-2 text-xs text-stone-600">{members.map((member) => <span key={member.id} className="rounded-full bg-white px-2 py-1">{member.name} · {profileCode(member)}</span>)}</div>
          </div>
          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t('teamDashboard.balanceTitle')}</p><p className="mt-2 text-sm leading-7 text-stone-700">{t('teamDashboard.balanceSummary', { primary: t(`traits.${strongest[0]}`), primaryValue: totals[strongest[0]], secondary: t(`traits.${strongest[1]}`), secondaryValue: totals[strongest[1]] })}</p><p className="mt-3 text-sm leading-7 text-stone-700">{t('teamDashboard.riskSummary', { trait: t(`traits.${lowest}`), risk: t(`teamDashboard.risks.${lowest}`) })}</p></div>
            <div className="grid grid-cols-2 gap-2">{traits.map((trait) => <div key={trait} className="rounded-2xl border border-stone-200 bg-stone-50 p-3"><span className="text-xs text-stone-500">{t(`traits.${trait}`)}</span><strong className="ml-2 text-stone-800">{totals[trait]}%</strong></div>)}</div>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t('teamDashboard.matrix')}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><select value={selectedA} onChange={(event) => setSelectedA(event.target.value)} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">{members.map((member) => <option key={member.id} value={member.id}>{member.name} · {profileCode(member)}</option>)}</select><select value={selectedB} onChange={(event) => setSelectedB(event.target.value)} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">{members.map((member) => <option key={member.id} value={member.id}>{member.name} · {profileCode(member)}</option>)}</select></div>
          {memberA && memberB ? <p className="mt-4 rounded-2xl bg-[#fbf3ea] p-4 text-sm leading-7 text-stone-700">{t(`teamDashboard.matrixTips.${memberA.profile.primaryTrait}.${memberB.profile.primaryTrait}`, { from: `${memberA.name} · ${profileCode(memberA)}`, to: `${memberB.name} · ${profileCode(memberB)}` })}</p> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{members.map((member) => <button key={member.id} type="button" onClick={() => setMembers((team) => team.filter((item) => item.id !== member.id))} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600">{t('teamDashboard.remove', { name: member.name })}</button>)}</div>
      </> : <p className="mt-5 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-5 text-sm leading-7 text-stone-600">{t('teamDashboard.empty')}</p>}
    </section>
  )
}
