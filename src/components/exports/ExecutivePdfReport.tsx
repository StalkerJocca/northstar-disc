import { Document, Page, StyleSheet, Svg, Polygon, Text, View } from '@react-pdf/renderer'
import type { DiscProfile, TraitKey } from '../../types/disc'

export type ExecutivePdfLabels = {
  brand: string
  reportTitle: string
  executiveProfile: string
  generated: string
  primary: string
  secondary: string
  profileOverview: string
  narrative: string
  narrativeText: string
  scores: string
  behaviouralInsights: string
  communication: string
  workStyle: string
  stressTriggers: string
  growthAreas: string
  conflictManagement: string
  coachingRecommendations: string
  conflictText: string
  coachingPoints: string[]
  actionPlan: string
  actionPlanIntro: string
  notes: string
  traitNames: Record<TraitKey, string>
  communicationText: string
  workStyleText: string
  stressText: string
  growthPoints: string[]
}

type ExecutivePdfReportProps = {
  profile: DiscProfile | null
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  candidateName: string
  generatedAt: string
  labels: ExecutivePdfLabels
}

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', color: '#2f241d', backgroundColor: '#fffaf5' },
  cover: { justifyContent: 'space-between' },
  eyebrow: { fontSize: 10, letterSpacing: 2.2, color: '#8b7565', textTransform: 'uppercase' },
  title: { fontSize: 34, fontFamily: 'Helvetica-Bold', lineHeight: 1.2, marginTop: 14 },
  subtitle: { fontSize: 14, color: '#5f4c3d', lineHeight: 1.6, marginTop: 14 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#f1ddca', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginTop: 22, fontSize: 12, fontFamily: 'Helvetica-Bold' },
  footer: { fontSize: 9, color: '#8b7565', marginTop: 20 },
  sectionTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 14 },
  card: { borderWidth: 1, borderColor: '#e8dfd6', borderRadius: 14, padding: 14, backgroundColor: '#fffdfb', marginBottom: 12 },
  cardTitle: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8b7565', marginBottom: 7 },
  body: { fontSize: 11, lineHeight: 1.65, color: '#5f4c3d' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#efe3d6' },
  scoreName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  scoreValue: { fontSize: 11, color: '#8b5e3c', fontFamily: 'Helvetica-Bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { width: '48.7%' },
  bullet: { flexDirection: 'row', marginTop: 7 },
  bulletDot: { width: 10, color: '#8b5e3c' },
  planLine: { borderBottomWidth: 1, borderBottomColor: '#d9c8b7', height: 30, marginTop: 5 },
})

function radarPoints(scores: DiscProfile['scores']) {
  const ordered = ['D', 'I', 'S', 'C'] as TraitKey[]
  return ordered.map((trait, index) => {
    const value = scores.find((score) => score.trait === trait)?.percentage ?? 0
    const angle = (Math.PI * 2 * index) / 4 - Math.PI / 2
    return `${100 + Math.cos(angle) * (value * 0.65)},${100 + Math.sin(angle) * (value * 0.65)}`
  }).join(' ')
}

export default function ExecutivePdfReport({ profile, primaryTrait, secondaryTrait, candidateName, generatedAt, labels }: ExecutivePdfReportProps) {
  const scores = profile?.scores ?? []
  return <Document title={`${labels.brand} — ${candidateName}`} author={labels.brand}>
    <Page size="A4" style={[styles.page, styles.cover]}>
      <View><Text style={styles.eyebrow}>{labels.brand}</Text><Text style={styles.title}>{labels.reportTitle}</Text><Text style={styles.subtitle}>{labels.executiveProfile}</Text><Text style={styles.badge}>{labels.traitNames[primaryTrait]} · {labels.traitNames[secondaryTrait]}</Text></View>
      <View><Text style={styles.title}>{candidateName}</Text><Text style={styles.subtitle}>{labels.generated}: {generatedAt}</Text><Text style={styles.footer}>{labels.brand} · Executive behavioural profile</Text></View>
    </Page>

    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrow}>{labels.brand}</Text><Text style={styles.sectionTitle}>{labels.profileOverview}</Text>
      <View style={[styles.card, { alignItems: 'center' }]}>
        <Svg width="240" height="220" viewBox="0 0 200 200"><Polygon points="100,20 180,100 100,180 20,100" fill="none" stroke="#dcc9b7" strokeWidth="1" /><Polygon points="100,52 148,100 100,148 52,100" fill="none" stroke="#dcc9b7" strokeWidth="1" /><Polygon points={radarPoints(scores)} fill="#c78e69" fillOpacity="0.35" stroke="#8b5e3c" strokeWidth="2" /></Svg>
      </View>
      <View style={styles.card}><Text style={styles.cardTitle}>{labels.scores}</Text>{scores.map((score) => <View key={score.trait} style={styles.scoreRow}><Text style={styles.scoreName}>{labels.traitNames[score.trait]}</Text><Text style={styles.scoreValue}>{score.percentage}%</Text></View>)}</View>
      <View style={styles.card}><Text style={styles.cardTitle}>{labels.narrative}</Text><Text style={styles.body}>{labels.narrativeText}</Text></View>
    </Page>

    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrow}>{labels.brand}</Text><Text style={styles.sectionTitle}>{labels.behaviouralInsights}</Text>
      <View style={styles.grid}>
        {[[labels.communication, labels.communicationText], [labels.workStyle, labels.workStyleText], [labels.stressTriggers, labels.stressText]].map(([title, body]) => <View key={title} style={[styles.card, styles.half]}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.body}>{body}</Text></View>)}
        <View style={[styles.card, styles.half]}><Text style={styles.cardTitle}>{labels.growthAreas}</Text>{labels.growthPoints.map((point) => <View key={point} style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text style={styles.body}>{point}</Text></View>)}</View>
      </View>
    </Page>

    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrow}>{labels.brand}</Text><Text style={styles.sectionTitle}>{labels.conflictManagement}</Text>
      <View style={styles.card}><Text style={styles.cardTitle}>{labels.conflictManagement}</Text><Text style={styles.body}>{labels.conflictText}</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>{labels.coachingRecommendations}</Text>{labels.coachingPoints.map((point) => <View key={point} style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text style={styles.body}>{point}</Text></View>)}</View>
    </Page>

    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrow}>{labels.brand}</Text><Text style={styles.sectionTitle}>{labels.actionPlan}</Text><Text style={styles.body}>{labels.actionPlanIntro}</Text>
      {[1, 2, 3].map((item) => <View key={item} style={[styles.card, { marginTop: 18 }]}><Text style={styles.cardTitle}>{item}. {labels.notes}</Text><View style={styles.planLine} /><View style={styles.planLine} /><View style={styles.planLine} /></View>)}
      <Text style={styles.footer}>{labels.brand} · {candidateName} · {generatedAt}</Text>
    </Page>
  </Document>
}
