import type { DiscAnswer, DiscScoreRequest, DiscScoreResponse, TraitKey } from '../types/disc'

const traitMeta: Record<TraitKey, { label: string; summary: string; strengths: string[]; stretch: string[]; shareLine: string }> = {
  D: {
    label: 'Drive',
    summary: 'You tend to move with clarity and conviction, especially when a path forward needs momentum.',
    strengths: ['You create momentum quickly.', 'You help teams move from idea to action.', 'You are comfortable making decisive calls.'],
    stretch: ['Pause long enough to hear the room.', 'Consider the emotional impact of urgency.', 'Invite others into the decision.'],
    shareLine: 'I’m leaning into Drive — clear, decisive, and quietly action-oriented.',
  },
  I: {
    label: 'Influence',
    summary: 'You bring energy, optimism, and connection to the people around you.',
    strengths: ['You spark conversation and connection.', 'You make ideas feel welcoming.', 'You bring warmth to a room.'],
    stretch: ['Leave room for quieter voices.', 'Pair enthusiasm with follow-through.', 'Ground big ideas in practical detail.'],
    shareLine: 'I’m leaning into Influence — warm, magnetic, and naturally people-centered.',
  },
  S: {
    label: 'Steadiness',
    summary: 'You create calm and trust by being steady, patient, and reliable.',
    strengths: ['You bring stability to difficult moments.', 'You make teams feel safe.', 'You carry patience and consistency.'],
    stretch: ['Practice speaking up sooner.', 'Let your pace be a strength without slowing everything down.', 'Share your perspective with confidence.'],
    shareLine: 'I’m leaning into Steadiness — calm, reliable, and deeply grounding.',
  },
  C: {
    label: 'Conscientiousness',
    summary: 'You tend to notice details, protect quality, and bring structure to complexity.',
    strengths: ['You raise the standard of work.', 'You notice what others may miss.', 'You create thoughtful systems and clarity.'],
    stretch: ['Let go of perfection when momentum matters.', 'Share early drafts instead of waiting for perfect polish.', 'Trust that progress can be good enough.'],
    shareLine: 'I’m leaning into Conscientiousness — thoughtful, precise, and quietly rigorous.',
  },
}

const traitOrder: TraitKey[] = ['D', 'I', 'S', 'C']

export function buildDiscScoreResult(request: DiscScoreRequest): DiscScoreResponse {
  if (!Array.isArray(request.answers) || request.answers.length === 0) {
    throw new Error('At least one answer is required.')
  }

  const validAnswers = request.answers.filter((answer): answer is DiscAnswer => Boolean(answer && answer.trait && traitOrder.includes(answer.trait)))

  if (validAnswers.length !== request.answers.length) {
    throw new Error('Some answers are invalid.')
  }

  const totals = traitOrder.reduce<Record<TraitKey, number>>((acc, trait) => {
    acc[trait] = 0
    return acc
  }, { D: 0, I: 0, S: 0, C: 0 })

  validAnswers.forEach((answer) => {
    totals[answer.trait] += 1
  })

  const maxValue = Math.max(...Object.values(totals))
  const scores = (traitOrder as TraitKey[]).map((trait) => ({
    trait,
    score: totals[trait],
    percentage: Math.round((totals[trait] / Math.max(1, maxValue)) * 100),
  }))

  const ranked = [...scores].sort((a, b) => b.score - a.score)
  const primaryTrait = ranked[0].trait
  const secondaryTrait = ranked[1]?.trait ?? primaryTrait
  const primaryMeta = traitMeta[primaryTrait]
  const secondaryMeta = traitMeta[secondaryTrait]

  return {
    success: true,
    profile: {
      primaryTrait,
      secondaryTrait,
      scores,
      narrative: `${primaryMeta.summary} In a quieter second layer, ${secondaryMeta.label.toLowerCase()} also shapes the way you connect, organize, or respond when the pressure is on.`,
      highlights: primaryMeta.strengths,
      growthPoints: primaryMeta.stretch,
      shareText: `${primaryMeta.shareLine} ${primaryMeta.summary}`,
    },
  }
}
