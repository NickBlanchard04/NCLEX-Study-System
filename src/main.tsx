import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { disableServiceWorkerInstallSupport } from './services/pwa'

const redirectTarget = new URLSearchParams(window.location.search).get('redirect')

if (redirectTarget) {
  window.history.replaceState(null, '', redirectTarget)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

disableServiceWorkerInstallSupport()
