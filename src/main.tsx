import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { BrandingProvider } from './contexts/BrandingContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandingProvider><App /></BrandingProvider>
  </StrictMode>,
)
