import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { defaultBranding, normalizeBranding, type BrandingConfig } from '../theme.config'
const BrandingContext = createContext<{ branding: BrandingConfig; setBranding: (value: BrandingConfig) => void }>({ branding: defaultBranding, setBranding: () => undefined })
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(() => {
    try { return normalizeBranding(JSON.parse(localStorage.getItem('northstar-branding') ?? '{}')) } catch { return defaultBranding }
  })
  useEffect(() => localStorage.setItem('northstar-branding', JSON.stringify(branding)), [branding])
  return <BrandingContext.Provider value={{ branding, setBranding: (value) => setBranding(normalizeBranding(value)) }}>{children}</BrandingContext.Provider>
}
export const useBranding = () => useContext(BrandingContext)
