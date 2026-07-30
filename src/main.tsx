import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { BrandingProvider } from './contexts/BrandingContext.tsx'
import CheckoutResultPage from './components/CheckoutResultPage.tsx'
import CoachWorkspace from './components/CoachWorkspace.tsx'

const isCheckoutRoute = window.location.pathname === '/checkout/success' || window.location.pathname === '/checkout/cancel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandingProvider>{isCheckoutRoute ? <CheckoutResultPage /> : window.location.pathname === '/workspace' ? <CoachWorkspace /> : <App />}</BrandingProvider>
  </StrictMode>,
)
