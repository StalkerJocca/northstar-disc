import '@testing-library/jest-dom/vitest'
import '../i18n'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({
      success: true,
      profile: {
        primaryTrait: 'D',
        secondaryTrait: 'I',
        scores: [
          { trait: 'D', score: 1, percentage: 100 },
          { trait: 'I', score: 1, percentage: 100 },
          { trait: 'S', score: 0, percentage: 0 },
          { trait: 'C', score: 0, percentage: 0 },
        ],
        narrative: 'A calm and deliberate profile narrative for the test run.',
        highlights: ['You create momentum quickly.'],
        growthPoints: ['Pause long enough to hear the room.'],
        shareText: 'A polished reflection for testing.',
      },
    }),
  })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})
