import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { disableServiceWorkerInstallSupport } from './services/pwa'
import { initializeGoogleTagManager } from './services/google-tag-manager'
import { initializeMetaPixel } from './services/meta-pixel'
import { safeStudyReturn } from './services/study-handoff'

const redirectTarget = new URLSearchParams(window.location.search).get('redirect')

if (redirectTarget) {
  window.history.replaceState(null, '', redirectTarget)
}

const studyReturn = safeStudyReturn(new URLSearchParams(window.location.search).get('studyReturn'))
if (studyReturn) {
  const target = new URL(studyReturn, window.location.origin)
  const code = new URLSearchParams(window.location.search).get('code')
  if (code) target.searchParams.set('code', code)
  window.history.replaceState(null, '', target.pathname + target.search + window.location.hash)
}

initializeGoogleTagManager()
initializeMetaPixel()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

disableServiceWorkerInstallSupport()
