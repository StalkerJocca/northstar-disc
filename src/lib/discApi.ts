import type { DiscScoreRequest, DiscScoreResult } from '../types/disc'
import { buildDiscScoreResult } from './discScoring'

export async function submitDiscScore(payload: DiscScoreRequest): Promise<DiscScoreResult> {
  try {
    const response = await fetch('/api/score', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('The scoring request failed.')
    }

    const data = (await response.json()) as DiscScoreResult

    if (!data.success) {
      throw new Error(data.error)
    }

    return data
  } catch {
    return buildDiscScoreResult(payload)
  }
}
