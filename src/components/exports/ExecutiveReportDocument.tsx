import { traitMeta } from '../../lib/discProfile'
import type { DiscScoreResponse, TraitKey } from '../../types/disc'

type ExecutiveReportDocumentProps = {
  profile: DiscScoreResponse['profile'] | null
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  completionScore: number
  generatedAt: string
}

const traitColors: Record<TraitKey, string> = {
  D: '#c78e69',
  I: '#d8b24a',
  S: '#688b6a',
  C: '#5d6f7d',
}

const insightPanels = [
  {
    title: 'Core Strengths & Key Motivators',
    body: 'Strengths show up in decisiveness, momentum, clarity, and the ability to make things happen with confidence.',
  },
  {
    title: 'Optimal Work & Leadership Environment',
    body: 'The most energizing context is one with clear objectives, meaningful ownership, and enough room to operate with autonomy.',
  },
  {
    title: 'Behavioral Tendencies Under Pressure',
    body: 'Pressure tends to sharpen the profile: fast-moving, decisive, and highly focused on outcomes when the stakes are high.',
  },
  {
    title: 'Communication & Collaboration Tips',
    body: 'Communication is strongest when it is direct, calm, and outcome-oriented while still leaving space for others to contribute.',
  },
]

export default function ExecutiveReportDocument({ profile, primaryTrait, secondaryTrait, completionScore, generatedAt }: ExecutiveReportDocumentProps) {
  const primaryMeta = traitMeta[primaryTrait]
  const secondaryMeta = traitMeta[secondaryTrait]
  const scores = profile?.scores ?? []

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        background: 'linear-gradient(135deg, #fffaf5 0%, #f6ebdf 100%)',
        color: '#34281f',
        fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
        padding: '24px',
        boxSizing: 'border-box',
        border: '1px solid #e8dfd6',
        borderRadius: '24px',
      }}
      className="executive-report"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <section
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            border: '1px solid #e8dfd6',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #fcf4ea 0%, #f2e1d0 100%)',
            padding: '20px 22px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700 }}>Northstar DISC</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px', color: '#2f241d' }}>{profile?.narrative ?? primaryMeta.summary}</div>
            <div style={{ fontSize: '14px', color: '#5f4c3d', marginTop: '8px' }}>{generatedAt}</div>
          </div>
          <div
            style={{
              background: '#fffdf8',
              border: '1px solid #e8dfd6',
              borderRadius: '999px',
              padding: '10px 14px',
              minWidth: '220px',
              boxShadow: '0 8px 24px rgba(84,56,45,0.08)',
            }}
          >
            <div style={{ fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700 }}>Executive Summary Badge</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#2f241d', marginTop: '6px' }}>Primary: {primaryMeta.label} • Secondary: {secondaryMeta.label}</div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px' }}>
          <div style={{ border: '1px solid #e8dfd6', borderRadius: '18px', background: '#fffdfb', padding: '16px' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700 }}>Trait Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '12px' }}>
              {scores.map((item) => {
                const meta = traitMeta[item.trait as TraitKey]
                return (
                  <div key={item.trait} style={{ background: '#f8efe7', borderRadius: '14px', padding: '10px 12px', border: '1px solid #ece0d2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: traitColors[item.trait as TraitKey] }} />
                        <span style={{ fontWeight: 700, color: '#2f241d' }}>{meta.label}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b584d' }}>{item.percentage}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '999px', background: '#efe0ce', marginTop: '8px' }}>
                      <div style={{ width: `${item.percentage}%`, height: '100%', borderRadius: '999px', background: traitColors[item.trait as TraitKey] }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b584d', marginTop: '8px' }}>Raw score: {item.score}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ border: '1px solid #e8dfd6', borderRadius: '18px', background: '#fffdfb', padding: '16px' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700 }}>Completion Snapshot</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#2f241d', marginTop: '10px' }}>{completionScore}% complete</div>
            <div style={{ fontSize: '14px', color: '#5f4c3d', marginTop: '8px' }}>Profile coverage and report readiness are strong and the narrative is ready for employer or coach review.</div>
            <div style={{ marginTop: '12px', borderRadius: '14px', padding: '10px 12px', background: '#f7efe6' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700 }}>Key Driver</div>
              <div style={{ fontWeight: 700, color: '#2f241d', marginTop: '6px' }}>{primaryMeta.label} + {secondaryMeta.label}</div>
            </div>
          </div>
        </section>

        <section style={{ border: '1px solid #e8dfd6', borderRadius: '18px', background: '#fffdfb', padding: '16px' }}>
          <div style={{ fontSize: '12px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700 }}>Profile Narrative</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginTop: '10px' }}>
            {insightPanels.map((panel) => (
              <div key={panel.title} style={{ borderRadius: '14px', padding: '14px', background: '#f7efe6', border: '1px solid #ece0d2' }}>
                <div style={{ fontWeight: 700, color: '#2f241d' }}>{panel.title}</div>
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#5f4c3d', marginTop: '8px' }}>{panel.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: '1px solid #e8dfd6', borderRadius: '18px', background: '#fffdfb', padding: '16px' }}>
          <div style={{ fontSize: '12px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700 }}>Why this matters</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginTop: '10px' }}>
            <div style={{ borderRadius: '14px', padding: '14px', background: '#f7efe6', border: '1px solid #ece0d2' }}>
              <div style={{ fontWeight: 700, color: '#2f241d' }}>Core Strengths</div>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px', color: '#5f4c3d', lineHeight: 1.6 }}>
                {(profile?.highlights ?? primaryMeta.strengths).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div style={{ borderRadius: '14px', padding: '14px', background: '#f7efe6', border: '1px solid #ece0d2' }}>
              <div style={{ fontWeight: 700, color: '#2f241d' }}>Development focus</div>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px', color: '#5f4c3d', lineHeight: 1.6 }}>
                {(profile?.growthPoints ?? primaryMeta.stretch).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
