export type TraitKey = 'D' | 'I' | 'S' | 'C'

export type TraitMeta = {
  label: string
  description: string
  summary: string
  strengths: string[]
  stretch: string[]
  shareLine: string
}

export const traitMeta: Record<TraitKey, TraitMeta> = {
  D: {
    label: 'Drive',
    description: 'Clear, direct, and momentum-first.',
    summary:
      'You tend to move with clarity and conviction when something needs forward motion. Your presence often brings decisive energy, especially when a path forward is unclear.',
    strengths: ['You create momentum quickly.', 'You help teams make a decision.', 'You are comfortable with action.'],
    stretch: ['Pause long enough to hear the room.', 'Consider the emotional impact of urgency.', 'Invite others into the decision.'],
    shareLine: 'I’m leaning into Drive — clear, decisive, and quietly action-oriented.',
  },
  I: {
    label: 'Influence',
    description: 'Warm, expressive, and people-centered.',
    summary:
      'You bring energy, optimism, and human connection into the space around you. Your style often helps people feel seen, included, and inspired to participate.',
    strengths: ['You spark conversation and connection.', 'You make ideas feel welcoming.', 'You bring warmth to a room.'],
    stretch: ['Leave a little space for quieter voices.', 'Pair enthusiasm with follow-through.', 'Ground big ideas in practical detail.'],
    shareLine: 'I’m leaning into Influence — warm, magnetic, and naturally people-centered.',
  },
  S: {
    label: 'Steadiness',
    description: 'Gentle, dependable, and grounded.',
    summary:
      'You create calm and trust by being steady, patient, and reliable. People often experience you as grounding, reassuring, and thoughtful in moments that require care.',
    strengths: ['You bring stability to difficult moments.', 'You make teams feel safe.', 'You carry patience and consistency.'],
    stretch: ['Practice speaking up sooner.', 'Let your pace be a strength without slowing everything down.', 'Share your perspective with confidence.'],
    shareLine: 'I’m leaning into Steadiness — calm, reliable, and deeply grounding.',
  },
  C: {
    label: 'Conscientiousness',
    description: 'Measured, thoughtful, and quality-led.',
    summary:
      'You tend to notice details, protect quality, and bring structure to complexity. Your approach often helps others feel supported by precision and intention.',
    strengths: ['You raise the standard of work.', 'You notice what others may miss.', 'You create thoughtful systems and clarity.'],
    stretch: ['Let go of perfection when momentum matters.', 'Share early drafts instead of waiting for perfect polish.', 'Trust that progress can be good enough.'],
    shareLine: 'I’m leaning into Conscientiousness — thoughtful, precise, and quietly rigorous.',
  },
}

export type ProfileSummary = {
  scores: Array<{ subject: string; value: number; fullMark: number }>
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  narrative: string
  highlights: string[]
  growthPoints: string[]
  shareText: string
  headline: string
  supportLabel: string
}

export function buildProfile(answers: string[]): ProfileSummary {
  const totals: Record<TraitKey, number> = { D: 0, I: 0, S: 0, C: 0 }

  answers.forEach((trait) => {
    totals[trait as TraitKey] += 1
  })

  const ranked = Object.entries(totals).sort(([, a], [, b]) => b - a) as Array<[TraitKey, number]>
  const [primaryTrait] = ranked[0]
  const [, secondaryScore] = ranked[1] ?? [primaryTrait, 0]
  const secondaryTrait = secondaryScore > 0 ? ranked[1][0] : primaryTrait

  const maxValue = Math.max(...Object.values(totals))
  const scores = (Object.entries(totals) as Array<[TraitKey, number]>).map(([key, value]) => ({
    subject: traitMeta[key].label,
    value: Math.round((value / Math.max(1, maxValue)) * 100),
    fullMark: 100,
  }))

  const primaryMeta = traitMeta[primaryTrait]
  const secondaryMeta = traitMeta[secondaryTrait]

  return {
    scores,
    primaryTrait,
    secondaryTrait,
    narrative: `${primaryMeta.summary} In a quieter second layer, ${secondaryMeta.label.toLowerCase()} also shapes the way you connect, organize, or respond when the pressure is on.`,
    highlights: primaryMeta.strengths,
    growthPoints: primaryMeta.stretch,
    shareText: `${primaryMeta.shareLine} ${primaryMeta.description}`,
    headline: `Your profile reads as ${primaryMeta.label.toLowerCase()} with a thoughtful ${secondaryMeta.label.toLowerCase()} undercurrent.`,
    supportLabel: `A calm, thoughtful reflection for ${primaryMeta.label.toLowerCase()} energy.`,
  }
}
