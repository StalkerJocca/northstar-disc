import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { BrandingProvider } from './contexts/BrandingContext.tsx'
import CheckoutResultPage from './components/CheckoutResultPage.tsx'

const isCheckoutRoute = window.location.pathname === '/checkout/success' || window.location.pathname === '/checkout/cancel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandingProvider>{isCheckoutRoute ? <CheckoutResultPage /> : <App />}</BrandingProvider>
  </StrictMode>,
)
