import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('seo assets', () => {
  it('publishes a static og preview image for social crawlers', () => {
    const previewPath = 'public/og-preview.png'
    const previewBytes = readFileSync(previewPath)

    expect(previewBytes.length).toBeGreaterThan(0)
    expect(previewBytes.subarray(0, 8).toString('hex')).toContain('89504e470d0a1a0a')
  })
})
