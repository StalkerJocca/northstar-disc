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
    body: 'Strengths show up in decisiveness, momentum, clarity, and the ability to turn vision into tangible outcomes with confidence.',
  },
  {
    title: 'Optimal Work & Leadership Environment',
    body: 'The most energizing context balances ambitious goals, meaningful ownership, and structured autonomy with a clear line of accountability.',
  },
  {
    title: 'Behavioral Tendencies Under Pressure',
    body: 'Pressure sharpens the profile: decision-making accelerates, communication becomes more direct, and outcomes remain a top priority.',
  },
  {
    title: 'Actionable Communication & Collaboration Tips',
    body: 'Keep conversations concise, calm, and outcome-oriented while leaving room for others to contribute, especially when urgency rises.',
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
      <style>{`
        @page {
          size: A4;
          margin: 15mm 12mm;
        }

        .executive-report * {
          box-sizing: border-box;
        }

        .report-card,
        .report-panel,
        .report-note,
        .report-header,
        .report-footer {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .report-card h2,
        .report-card h3,
        .report-panel h3,
        .report-note h3,
        .report-header h1,
        .report-footer span {
          page-break-after: avoid;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <section
          className="report-header"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 0.95fr',
            gap: '14px',
            border: '1px solid #e8dfd6',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #faf1e7 0%, #f1ddca 100%)',
            padding: '18px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#8b5e3c',
                  color: '#fffaf5',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                ND
              </div>
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>Northstar DISC</div>
                <div style={{ fontSize: '16px', color: '#5f4c3d', marginTop: '4px', fontFamily: 'Arial, sans-serif' }}>{candidateName}</div>
              </div>
            </div>

            <h1
              style={{
                margin: '14px 0 0',
                fontSize: '24px',
                lineHeight: 1.25,
                color: '#2f241d',
                fontWeight: 700,
              }}
            >
              Executive Behavioral Report
            </h1>

            <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: 1.6, color: '#5f4c3d', fontFamily: 'Arial, sans-serif' }}>
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
              background: '#fffdf8',
              border: '1px solid #e8dfd6',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 10px 24px rgba(84,56,45,0.08)',
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8b7565', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
              Executive Summary Badge
            </div>
            <div style={{ marginTop: '8px', fontSize: '16px', lineHeight: 1.4, fontWeight: 700, color: '#2f241d' }}>
              Primary: {primaryMeta.label} | Secondary: {secondaryMeta.label}
            </div>
            <div style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, color: '#5f4c3d', fontFamily: 'Arial, sans-serif' }}>
              A high-clarity behavioral profile designed for coaching, hiring, and team planning conversations.
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '14px' }}>
          <div className="report-card" style={{ border: '1px solid #e8dfd6', borderRadius: '18px', background: '#fffdfb', padding: '15px' }}>
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
              Data Visualizations
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
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
          {insightPanels.map((panel) => (
            <div key={panel.title} className="report-panel" style={{ border: '1px solid #e8dfd6', borderRadius: '16px', background: '#fffdfb', padding: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#2f241d' }}>{panel.title}</h3>
              <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.7, color: '#5f4c3d', fontFamily: 'Arial, sans-serif' }}>{panel.body}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
          <div className="report-note" style={{ border: '1px solid #e8dfd6', borderRadius: '16px', background: '#f7efe6', padding: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#2f241d' }}>Core Strengths</h3>
            <ul style={{ margin: '10px 0 0 0', paddingLeft: '18px', color: '#5f4c3d', lineHeight: 1.7, fontFamily: 'Arial, sans-serif' }}>
              {(profile?.highlights ?? primaryMeta.strengths).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div className="report-note" style={{ border: '1px solid #e8dfd6', borderRadius: '16px', background: '#f7efe6', padding: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#2f241d' }}>Development Focus</h3>
            <ul style={{ margin: '10px 0 0 0', paddingLeft: '18px', color: '#5f4c3d', lineHeight: 1.7, fontFamily: 'Arial, sans-serif' }}>
              {(profile?.growthPoints ?? primaryMeta.stretch).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>

        <footer
          className="report-footer"
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
