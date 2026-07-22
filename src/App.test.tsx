import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('DISC experience', () => {
  it('renders the quiz flow and shows the results after answering all questions', async () => {
    render(<App />)

    expect(screen.getAllByText(/northstar disc/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/turn self-awareness into action/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /start your reflection/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start your reflection/i }))

    await waitFor(() => {
      expect(screen.getByText(/your reflection starts here/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/when i’m building momentum/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /move quickly and decisively/i }))

    await waitFor(() => {
      expect(screen.getByText(/in a group setting/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /set the direction and pace/i }))

    await waitFor(() => {
      expect(screen.getByText(/my natural rhythm is/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /bold, active, and results-led/i }))

    await waitFor(() => {
      expect(screen.getByText(/your gentle profile/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/what this means in practice/i)).toBeInTheDocument()
    expect(screen.getByText(/next-step guidance/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /copy summary/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /download card/i }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: /copy summary/i })[0])
    await waitFor(() => {
      expect(screen.getByText(/saved to clipboard/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /back to intro/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back to intro/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start your reflection/i })).toBeInTheDocument()
    })
    expect(screen.getAllByText(/turn self-awareness into action/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/why leaders use it/i)).toBeInTheDocument()
  })
})
