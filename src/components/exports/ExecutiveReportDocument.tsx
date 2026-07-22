import { traitMeta } from '../../lib/discProfile'
import type { DiscScoreResponse, TraitKey } from '../../types/disc'

type ExecutiveReportDocumentProps = {
  profile: DiscScoreResponse['profile'] | null
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  completionScore: number
  generatedAt: string
  candidateName?: string
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
    body: 'This profile tends to move quickly from intent to action, creates momentum in ambiguous settings, and responds well when the opportunity is directional and timely.',
  },
  {
    title: 'Optimal Work & Leadership Environment',
    body: 'The best environment combines strong goals, ownership, clear expectations, and enough space to act with conviction while still collaborating with the right people.',
  },
  {
    title: 'Behavioral Tendencies Under Pressure',
    body: 'Under pressure, the profile becomes more decisive, more results-oriented, and more focused on urgency, alignment, and practical execution rather than extended debate.',
  },
  {
    title: 'Actionable Communication & Collaboration Tips',
    body: 'Use short, direct updates, frame conversation around outcomes, and pair confidence with a deliberate invitation for others to contribute and stay aligned.',
  },
]

const reportCopy = {
  documentVersion: 'v1.3',
  tagline: 'Generated via Northstar DISC — northstar-disc.vercel.app',
}

function buildRadarPolygon(scores: Array<{ trait: TraitKey; percentage: number }>) {
  const points = scores.map((item, index) => {
    const angle = (Math.PI * 2 * index) / scores.length - Math.PI / 2
    const radius = (item.percentage / 100) * 86
    const x = 108 + Math.cos(angle) * radius
    const y = 112 + Math.sin(angle) * radius
    return `${x},${y}`
  })

  return points.join(' ')
}

export default function ExecutiveReportDocument({
  profile,
  primaryTrait,
  secondaryTrait,
  completionScore,
  generatedAt,
  candidateName = 'Northstar DISC Candidate',
}: ExecutiveReportDocumentProps) {
  const primaryMeta = traitMeta[primaryTrait]
  const secondaryMeta = traitMeta[secondaryTrait]
  const scores = profile?.scores ?? []
  const radarPoints = buildRadarPolygon(scores)

  return (
    <div
      style={{
        width: '100%',
        minHeight: '1123px',
        background: 'linear-gradient(135deg, #fffaf5 0%, #f4e8dd 100%)',
        color: '#34281f',
        fontFamily: 'Georgia, "Times New Roman", serif',
        padding: '18px',
        boxSizing: 'border-box',
        border: '1px solid #e8dfd6',
        borderRadius: '24px',
      }}
      className="executive-report"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <section
          className="report-header"
          data-export-section="header"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 0.95fr',
            gap: '14px',
            border: '1px solid #e8dfd6',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #faf1e7 0%, #f1ddca 100%)',
            padding: '18px',
            boxShadow: '0 14px 36px rgba(88, 62, 45, 0.08)',
            breakInside: 'avoid',
          }}
        >
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #8b5e3c 0%, #b98254 100%)',
                  color: '#fffaf5',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  fontFamily: 'Arial, sans-serif',
                  boxShadow: '0 10px 22px rgba(139, 94, 60, 0.26)',
                }}
              >
                ND
              </div>
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>Northstar DISC</div>
                <div style={{ fontSize: '19px', color: '#4c3a2e', marginTop: '4px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>{candidateName}</div>
                <div style={{ fontSize: '12px', color: '#7a6455', marginTop: '4px', fontFamily: 'Arial, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Board-Level Executive Summary</div>
              </div>
            </div>

            <h1
              style={{
                margin: '16px 0 0',
                fontSize: '28px',
                lineHeight: 1.2,
                color: '#2f241d',
                fontWeight: 700,
              }}
            >
              Executive Behavioral Report
            </h1>

            <div style={{ marginTop: '12px', fontSize: '14px', lineHeight: 1.7, color: '#5f4c3d', fontFamily: 'Arial, sans-serif' }}>
              {profile?.narrative ?? primaryMeta.summary}
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  borderRadius: '999px',
                  background: '#fffdf8',
                  border: '1px solid #e8dfd6',
                  padding: '7px 10px',
                  fontSize: '12px',
                  color: '#6b584d',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Completion date: {generatedAt}
              </span>
              <span
                style={{
                  borderRadius: '999px',
                  background: '#fffdf8',
                  border: '1px solid #e8dfd6',
                  padding: '7px 10px',
                  fontSize: '12px',
                  color: '#6b584d',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Completion score: {completionScore}%
              </span>
              <span
                style={{
                  borderRadius: '999px',
                  background: '#fffdf8',
                  border: '1px solid #e8dfd6',
                  padding: '7px 10px',
                  fontSize: '12px',
                  color: '#6b584d',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Document version: {reportCopy.documentVersion}
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'linear-gradient(180deg, #fffdf9 0%, #f8efe7 100%)',
              border: '1px solid #e8dfd6',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 10px 24px rgba(84,56,45,0.08)',
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#8b5e3c' }} />
              <div style={{ fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
                Executive Summary Badge
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', lineHeight: 1.4, fontWeight: 700, color: '#2f241d' }}>
              Primary: {primaryMeta.label} | Secondary: {secondaryMeta.label}
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.6, color: '#5f4c3d', fontFamily: 'Arial, sans-serif' }}>
              A high-clarity behavioral profile designed for coaching, hiring, and team planning conversations.
            </div>
          </div>
        </section>

        <section data-export-section="profile-overview" style={{ display: 'grid', gridTemplateColumns: '1.12fr 0.88fr', gap: '14px', breakInside: 'avoid' }}>
          <div style={{ border: '1px solid #e8dfd6', borderRadius: '18px', background: '#fffdfb', padding: '15px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
              Trait Breakdown & KPI Chips
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '12px' }}>
              {scores.map((item) => {
                const meta = traitMeta[item.trait as TraitKey]
                return (
                  <div key={item.trait} style={{ background: '#f8efe7', borderRadius: '14px', padding: '10px 12px', border: '1px solid #ece0d2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: traitColors[item.trait as TraitKey] }} />
                        <span style={{ fontWeight: 700, color: '#2f241d', fontFamily: 'Arial, sans-serif' }}>{meta.label}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b584d', fontFamily: 'Arial, sans-serif' }}>{item.percentage}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '999px', background: '#efe0ce', marginTop: '8px' }}>
                      <div style={{ width: `${Math.max(8, item.percentage)}%`, height: '100%', borderRadius: '999px', background: traitColors[item.trait as TraitKey] }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b584d', marginTop: '8px', fontFamily: 'Arial, sans-serif' }}>Raw score: {item.score}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="report-card" style={{ border: '1px solid #e8dfd6', borderRadius: '18px', background: '#fffdfb', padding: '15px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
              Profile Radar Chart
            </div>
            <div style={{ marginTop: '12px', borderRadius: '16px', background: 'radial-gradient(circle at top, #fffaf6 0%, #f8efe8 100%)', padding: '10px', border: '1px solid #efe1d0' }}>
              <svg viewBox="0 0 220 220" width="100%" height="220" aria-label="DISC radar chart" role="img">
                <polygon points="108,28 187,57 187,135 108,192 30,135 30,57" fill="none" stroke="#ead9c6" strokeWidth="1" />
                <polygon points="108,46 163,68 163,125 108,167 53,125 53,68" fill="none" stroke="#ead9c6" strokeWidth="1" />
                <polygon points="108,63 139,78 139,112 108,138 76,112 76,78" fill="none" stroke="#ead9c6" strokeWidth="1" />
                <polygon points="108,84 115,89 115,106 108,113 101,106 101,89" fill="none" stroke="#ead9c6" strokeWidth="1" />
                <polygon points={radarPoints} fill="#c78e69" fillOpacity="0.32" stroke="#8b5e3c" strokeWidth="2" />
                {scores.map((item, index) => {
                  const angle = (Math.PI * 2 * index) / scores.length - Math.PI / 2
                  const radius = (item.percentage / 100) * 86
                  const x = 108 + Math.cos(angle) * radius
                  const y = 112 + Math.sin(angle) * radius
                  const label = traitMeta[item.trait as TraitKey].label
                  return (
                    <g key={item.trait}>
                      <circle cx={x} cy={y} r="3.8" fill={traitColors[item.trait as TraitKey]} stroke="#fffaf5" strokeWidth="1.4" />
                      <text x={x} y={y - 7} textAnchor="middle" fill={traitColors[item.trait as TraitKey]} fontSize="8" fontFamily="Arial, sans-serif">{label}</text>
                    </g>
                  )
                })}
              </svg>
            </div>
            <div style={{ marginTop: '10px', borderRadius: '12px', background: '#f7efe6', padding: '10px 12px', fontSize: '12px', color: '#5f4c3d', fontFamily: 'Arial, sans-serif' }}>
              Interpretation: {primaryMeta.label} leads the profile with a supporting {secondaryMeta.label.toLowerCase()} contribution.
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
          {insightPanels.map((panel, index) => (
            <div key={panel.title} data-export-section={`insight-${index}`} style={{ border: '1px solid #e8dfd6', borderRadius: '16px', background: '#fffdfb', padding: '14px', minHeight: '126px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#2f241d' }}>{panel.title}</h3>
              <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.7, color: '#5f4c3d', fontFamily: 'Arial, sans-serif' }}>{panel.body}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
          <div data-export-section="core-strengths" style={{ border: '1px solid #e8dfd6', borderRadius: '16px', background: '#f7efe6', padding: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#2f241d' }}>Core Strengths</h3>
            <ul style={{ margin: '10px 0 0 0', paddingLeft: '18px', color: '#5f4c3d', lineHeight: 1.7, fontFamily: 'Arial, sans-serif' }}>
              {(profile?.highlights ?? primaryMeta.strengths).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div data-export-section="development-focus" className="report-note" style={{ border: '1px solid #e8dfd6', borderRadius: '16px', background: '#f7efe6', padding: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#2f241d' }}>Development Focus</h3>
            <ul style={{ margin: '10px 0 0 0', paddingLeft: '18px', color: '#5f4c3d', lineHeight: 1.7, fontFamily: 'Arial, sans-serif' }}>
              {(profile?.growthPoints ?? primaryMeta.stretch).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>

        <footer
          data-export-section="footer"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '10px',
            alignItems: 'center',
            padding: '10px 4px 0',
            color: '#806d5d',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            borderTop: '1px solid #eadfd1',
            marginTop: '6px',
          }}
        >
          <span>Northstar DISC — Executive Report</span>
          <span>{reportCopy.tagline}</span>
        </footer>
      </div>
    </div>
  )
}
