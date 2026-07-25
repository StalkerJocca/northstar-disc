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
    expect(screen.getAllByRole('button', { name: /start your reflection/i }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: /start your reflection/i })[0])

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

  it('lets users review and edit a previous answer before submitting the assessment', async () => {
    const persistedState = {
      step: 49,
      answers: Array(49).fill('D'),
      selected: null,
      showResults: false,
      started: true,
      profile: null,
      apiError: null,
      isScoring: false,
    }

    window.localStorage.setItem('disc-wellness-progress', JSON.stringify(persistedState))

    render(<App />)

    expect(screen.getByText(/question 50 of 50/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /achieving power, influence, and high-impact accomplishments/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/review your responses/i)[0]).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /submit assessment/i })).toBeInTheDocument()
  })

  it('shows the consent banner and lets users clear their local assessment data', async () => {
    render(<App />)

    expect(screen.getByText(/we use cookies and local storage/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /accept all/i }))

    expect(window.localStorage.getItem('disc-wellness-consent')).toContain('analytics')

    fireEvent.click(screen.getByRole('button', { name: /privacy & data settings/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /clear my assessment data/i }))

    expect(window.localStorage.getItem('disc-wellness-progress')).toBeNull()
  })
})
