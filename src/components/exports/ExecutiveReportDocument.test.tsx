import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ExecutiveReportDocument from './ExecutiveReportDocument'

describe('ExecutiveReportDocument', () => {
  it('renders the report shell', () => {
    render(
      <ExecutiveReportDocument
        profile={null}
        primaryTrait="D"
        secondaryTrait="I"
        completionScore={82}
        generatedAt="2026-07-24"
      />,
    )

    expect(screen.getByText('Northstar DISC Candidate')).toBeInTheDocument()
  })
})
