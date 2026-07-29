export type TraitKey = 'D' | 'I' | 'S' | 'C'

export const traitKeys = ['D', 'I', 'S', 'C'] as const satisfies readonly TraitKey[]

export type TraitScore = {
  trait: TraitKey
  score: number
  percentage: number
}

export type DiscProfile = {
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
  scores: TraitScore[]
  narrative: string
  highlights: string[]
  growthPoints: string[]
  shareText: string
}

export function isTraitKey(value: unknown): value is TraitKey {
  return typeof value === 'string' && traitKeys.includes(value as TraitKey)
}

export type DiscAnswer = {
  trait: TraitKey
}

export type DiscScoreRequest = {
  answers: DiscAnswer[]
}

export type DiscScoreResponse = {
  success: true
  profile: DiscProfile
}

export type DiscScoreErrorResponse = {
  success: false
  error: string
}

export type DiscScoreResult = DiscScoreResponse | DiscScoreErrorResponse
