import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('DISC experience', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores the current quiz progress from localStorage', () => {
    const persistedState = {
      step: 3,
      answers: ['D', 'I', 'S'],
      selected: 'C',
      showResults: false,
      started: true,
      profile: null,
      apiError: null,
      isScoring: false,
    }

    window.localStorage.setItem('disc-wellness-progress', JSON.stringify(persistedState))

    render(<App />)

    expect(screen.getByText(/my natural speed of execution is usually/i)).toBeInTheDocument()
    expect(screen.getByText(/step 4 of 50/i)).toBeInTheDocument()
  })

  it('renders the quiz flow and advances through the first prompts', async () => {
    render(<App />)

    expect(screen.getAllByText(/northstar disc/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/turn self-awareness into action/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /start your reflection/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start your reflection/i }))

    await waitFor(() => {
      expect(screen.getByText(/your reflection starts here/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/when building momentum/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /move quickly and decisively/i }))

    await waitFor(() => {
      expect(screen.getByText(/in a group setting/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/step 2 of 50/i)).toBeInTheDocument()

    const secondQuestionOption = await screen.findByRole('button', { name: /set clear direction/i })
    fireEvent.click(secondQuestionOption)

    await waitFor(() => {
      expect(screen.getByText(/when making important decisions/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/step 3 of 50/i)).toBeInTheDocument()
  })
})
