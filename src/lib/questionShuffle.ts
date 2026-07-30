/**
 * Produces a stable, non-mutating option order for an assessment question.
 * The question index is the seed, so refreshing or revisiting a question never
 * changes the visual order or the option's DISC trait.
 */
export function shuffleQuestionOptions<T>(options: readonly T[], questionIndex: number): T[] {
  const shuffled = [...options]
  let state = ((questionIndex + 1) * 0x9e3779b1) >>> 0
  const next = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return state >>> 0
  }
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = next() % (index + 1)
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}
