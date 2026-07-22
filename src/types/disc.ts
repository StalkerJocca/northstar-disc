export type TraitKey = 'D' | 'I' | 'S' | 'C'

export type DiscAnswer = {
  trait: TraitKey
}

export type DiscScoreRequest = {
  answers: DiscAnswer[]
}

export type DiscScoreResponse = {
  success: true
  profile: {
    primaryTrait: TraitKey
    secondaryTrait: TraitKey
    scores: Array<{ trait: TraitKey; score: number; percentage: number }>
    narrative: string
    highlights: string[]
    growthPoints: string[]
    shareText: string
  }
}

export type DiscScoreErrorResponse = {
  success: false
  error: string
}

export type DiscScoreResult = DiscScoreResponse | DiscScoreErrorResponse
