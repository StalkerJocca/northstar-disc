import type { TraitKey } from '../types/disc'

export const defaultSiteUrl = 'https://northstar-disc.vercel.app'
export const defaultPageTitle = 'Northstar DISC | Free DISC Assessment for Executive Leadership'
export const defaultPageDescription =
  'Free DISC Assessment and Executive Leadership Profile for leaders. Discover your behavioral signature and share your DISC profile with your team.'
export const defaultOgImage = `${defaultSiteUrl}/og-preview.png`

export type ProfileQueryTraits = {
  primaryTrait: TraitKey
  secondaryTrait: TraitKey
}

export function buildProfilePreviewUrl(profileCode: string) {
  const url = new URL(defaultSiteUrl)
  url.searchParams.set('profile', profileCode.toUpperCase())
  return url.toString()
}

export function parseProfileCode(profileCode?: string): ProfileQueryTraits | null {
  if (!profileCode) {
    return null
  }

  const normalized = profileCode.trim().toUpperCase()
  if (normalized.length < 1) {
    return null
  }

  const primary = normalized.charAt(0) as TraitKey
  const secondary = (normalized.charAt(1) || normalized.charAt(0)) as TraitKey

  const validTraits = ['D', 'I', 'S', 'C']
  if (!validTraits.includes(primary) || !validTraits.includes(secondary)) {
    return null
  }

  return {
    primaryTrait: primary,
    secondaryTrait: secondary,
  }
}
