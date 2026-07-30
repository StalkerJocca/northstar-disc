export type BrandingConfig = {
  agencyName: string
  accentColor: string
  logoUrl: string
  footerNote: string
  typography: 'serif' | 'modern'
}

export const defaultBranding: BrandingConfig = {
  agencyName: '',
  accentColor: '#8b5e3c',
  logoUrl: '',
  footerNote: '',
  typography: 'serif',
}

export function normalizeBranding(value: Partial<BrandingConfig>): BrandingConfig {
  return {
    agencyName: typeof value.agencyName === 'string' ? value.agencyName.trim().slice(0, 100) : '',
    accentColor: typeof value.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.accentColor) ? value.accentColor : defaultBranding.accentColor,
    logoUrl: typeof value.logoUrl === 'string' ? value.logoUrl.trim().slice(0, 2_000) : '',
    footerNote: typeof value.footerNote === 'string' ? value.footerNote.trim().slice(0, 180) : '',
    typography: value.typography === 'modern' ? 'modern' : 'serif',
  }
}
