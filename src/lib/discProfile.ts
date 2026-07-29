import { isTraitKey, type TraitKey } from '../types/disc'

export type { TraitKey } from '../types/disc'

export type TraitMeta = {
  label: string
  description: string
  summary: string
  work: string
  team: string
  leadership: string
  life: string
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
    work: 'At work, you are the person who cuts through ambiguity and gets the team moving toward the next milestone. You thrive when you can set a bold direction and deliver fast.',
    team: 'In teams, your style is a catalyst for progress. People respect your momentum; just make room for others to contribute so your energy lands as decisive rather than overwhelming.',
    leadership: 'As a leader, you are trusted to make clear calls and keep priorities on track. Your strongest leadership moments come when you combine drive with thoughtful listening.',
    life: 'Outside work, you may prefer action over small talk. You value practical outcomes and often create momentum in projects, goals, and personal routines.',
    strengths: ['You create momentum quickly.', 'You help teams make a decision.', 'You are comfortable with action.'],
    stretch: ['Pause long enough to hear the room.', 'Consider the emotional impact of urgency.', 'Invite others into the decision.'],
    shareLine: 'I’m leaning into Drive — clear, decisive, and quietly action-oriented.',
  },
  I: {
    label: 'Influence',
    description: 'Warm, expressive, and people-centered.',
    summary:
      'You bring energy, optimism, and human connection into the space around you. Your style often helps people feel seen, included, and inspired to participate.',
    work: 'At work, you are most effective when you can build alignment and keep people energized around a shared idea. You shine in collaborative settings and presentations.',
    team: 'In teams, your presence often draws others in. You make group work more engaging, and you are the person who keeps momentum through connection.',
    leadership: 'As a leader, you are persuasive and motivating. Your best moments are when you use emotion and vision to bring a group together around a bold possibility.',
    life: 'Outside work, you naturally cultivate warm relationships and lively environments. You enjoy social energy and tend to make events feel inviting.',
    strengths: ['You spark conversation and connection.', 'You make ideas feel welcoming.', 'You bring warmth to a room.'],
    stretch: ['Leave a little space for quieter voices.', 'Pair enthusiasm with follow-through.', 'Ground big ideas in practical detail.'],
    shareLine: 'I’m leaning into Influence — warm, magnetic, and naturally people-centered.',
  },
  S: {
    label: 'Steadiness',
    description: 'Gentle, dependable, and grounded.',
    summary:
      'You create calm and trust by being steady, patient, and reliable. People often experience you as grounding, reassuring, and thoughtful in moments that require care.',
    work: 'At work, you are the stabilizer who keeps the process moving without drama. Your consistency helps teams stay focused and grounded through change.',
    team: 'In teams, you are the dependable teammate people turn to when they need reassurance and follow-through. Your calm presence helps others feel supported.',
    leadership: 'As a leader, you excel at creating a sense of safety and predictability. Your best leadership moments come when you provide steady guidance and support.',
    life: 'Outside work, you value routines, harmony, and meaningful connections. You often show care through thoughtful consistency rather than grand gestures.',
    strengths: ['You bring stability to difficult moments.', 'You make teams feel safe.', 'You carry patience and consistency.'],
    stretch: ['Practice speaking up sooner.', 'Let your pace be a strength without slowing everything down.', 'Share your perspective with confidence.'],
    shareLine: 'I’m leaning into Steadiness — calm, reliable, and deeply grounding.',
  },
  C: {
    label: 'Conscientiousness',
    description: 'Measured, thoughtful, and quality-led.',
    summary:
      'You tend to notice details, protect quality, and bring structure to complexity. Your approach often helps others feel supported by precision and intention.',
    work: 'At work, you thrive when you can refine details, design systems, and ensure that execution is accurate. You are the one people trust to keep standards high.',
    team: 'In teams, your contribution is the thoughtful critic and architect. You help turn good ideas into reliable plans and reduce the risk of costly mistakes.',
    leadership: 'As a leader, you bring discipline and clarity. Your strongest leadership comes from creating systems, standards, and processes that keep others aligned and accountable.',
    life: 'Outside work, you value order, precision, and meaningful quality. You often prefer well-made solutions and thoughtful planning over spontaneity.',
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

export function buildProfile(answers: readonly TraitKey[]): ProfileSummary {
  const totals: Record<TraitKey, number> = { D: 0, I: 0, S: 0, C: 0 }

  answers.forEach((trait) => {
    if (isTraitKey(trait)) {
      totals[trait] += 1
    }
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
