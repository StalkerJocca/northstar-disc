import { describe, expect, it } from 'vitest'
import { shuffleQuestionOptions } from './questionShuffle'

describe('shuffleQuestionOptions', () => {
  const options = [
    { label: 'Drive', trait: 'D' }, { label: 'Influence', trait: 'I' },
    { label: 'Steadiness', trait: 'S' }, { label: 'Conscientiousness', trait: 'C' },
  ]

  it('is stable for the same question after a refresh', () => {
    expect(shuffleQuestionOptions(options, 12)).toEqual(shuffleQuestionOptions(options, 12))
  })

  it('preserves each option and its trait association', () => {
    const shuffled = shuffleQuestionOptions(options, 4)
    expect(shuffled).toHaveLength(options.length)
    expect(shuffled.map((item) => `${item.label}:${item.trait}`).sort())
      .toEqual(options.map((item) => `${item.label}:${item.trait}`).sort())
  })
})
