import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SocialShareButtons from './SocialShareButtons'

describe('SocialShareButtons', () => {
  it('routes each visible channel through the application share handler', () => {
    const onShare = vi.fn()
    render(<SocialShareButtons shareText="Northstar profile" onShare={onShare} />)

    fireEvent.click(screen.getByRole('button', { name: /share on linkedin/i }))
    fireEvent.click(screen.getByRole('button', { name: /share on x/i }))
    fireEvent.click(screen.getByRole('button', { name: /share by email/i }))

    expect(onShare).toHaveBeenNthCalledWith(1, 'linkedin')
    expect(onShare).toHaveBeenNthCalledWith(2, 'twitter')
    expect(onShare).toHaveBeenNthCalledWith(3, 'email')
  })

  it('prevents interaction while a share is being prepared', () => {
    const onShare = vi.fn()
    render(<SocialShareButtons shareText="Northstar profile" onShare={onShare} disabled />)

    fireEvent.click(screen.getByRole('button', { name: /share on linkedin/i }))
    expect(onShare).not.toHaveBeenCalled()
  })
})
