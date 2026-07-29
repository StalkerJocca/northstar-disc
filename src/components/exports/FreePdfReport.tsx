import { Document, Page, StyleSheet, Svg, Polygon, Text, View } from '@react-pdf/renderer'
import type { DiscProfile, TraitKey } from '../../types/disc'

type FreePdfReportProps = { profile: DiscProfile | null; primaryTrait: TraitKey; secondaryTrait: TraitKey; generatedAt: string; labels: { brand: string; title: string; summary: string; strengths: string; generated: string; traitNames: Record<TraitKey, string>; narrative: string; highlights: string[] } }

const styles = StyleSheet.create({ page: { padding: 42, fontFamily: 'Helvetica', backgroundColor: '#fffaf5', color: '#2f241d' }, eyebrow: { fontSize: 9, letterSpacing: 2, color: '#8b7565' }, title: { fontSize: 27, fontFamily: 'Helvetica-Bold', marginTop: 10 }, subtitle: { fontSize: 12, color: '#5f4c3d', marginTop: 8 }, layout: { flexDirection: 'row', gap: 16, marginTop: 24 }, panel: { width: '50%', borderWidth: 1, borderColor: '#e8dfd6', borderRadius: 14, padding: 14, backgroundColor: '#fffdfb' }, section: { fontSize: 10, letterSpacing: 1.2, color: '#8b7565', marginBottom: 8 }, body: { fontSize: 10.5, lineHeight: 1.6, color: '#5f4c3d' }, score: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7, fontSize: 10 }, badge: { marginTop: 16, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1ddca', fontSize: 10, fontFamily: 'Helvetica-Bold' }, footer: { position: 'absolute', bottom: 34, left: 42, fontSize: 8, color: '#8b7565' } })

function points(scores: DiscProfile['scores']) { return (['D', 'I', 'S', 'C'] as TraitKey[]).map((trait, index) => { const value = scores.find((score) => score.trait === trait)?.percentage ?? 0; const angle = (Math.PI * 2 * index) / 4 - Math.PI / 2; return `${80 + Math.cos(angle) * value * .48},${80 + Math.sin(angle) * value * .48}` }).join(' ') }

export default function FreePdfReport({ profile, primaryTrait, secondaryTrait, generatedAt, labels }: FreePdfReportProps) {
  const scores = profile?.scores ?? []
  return <Document title={`${labels.brand} — ${labels.title}`}><Page size="A4" style={styles.page}>
    <Text style={styles.eyebrow}>{labels.brand} · {labels.generated} {generatedAt}</Text><Text style={styles.title}>{labels.title}</Text><Text style={styles.subtitle}>{labels.summary}</Text><Text style={styles.badge}>{labels.traitNames[primaryTrait]} · {labels.traitNames[secondaryTrait]}</Text>
    <View style={styles.layout}><View style={styles.panel}><Text style={styles.section}>DISC</Text><Svg width="220" height="190" viewBox="0 0 160 160"><Polygon points="80,14 146,80 80,146 14,80" fill="none" stroke="#dcc9b7" /><Polygon points={points(scores)} fill="#c78e69" fillOpacity="0.35" stroke="#8b5e3c" strokeWidth="2" /></Svg>{scores.map((score) => <View key={score.trait} style={styles.score}><Text>{labels.traitNames[score.trait]}</Text><Text>{score.percentage}%</Text></View>)}</View><View style={styles.panel}><Text style={styles.section}>{labels.summary}</Text><Text style={styles.body}>{labels.narrative}</Text><Text style={[styles.section, { marginTop: 18 }]}>{labels.strengths}</Text>{labels.highlights.slice(0, 3).map((item) => <Text key={item} style={[styles.body, { marginTop: 6 }]}>• {item}</Text>)}</View></View>
    <Text style={styles.footer}>{labels.brand} · Free individual report</Text>
  </Page></Document>
}
