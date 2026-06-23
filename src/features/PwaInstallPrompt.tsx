import { AnimatePresence, motion } from 'framer-motion'
import { Download, Smartphone, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const isStandaloneDisplay = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ((window.navigator as Navigator & { standalone?: boolean }).standalone === true)

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('nclex-pwa-install-dismissed') === 'true')
  const [installed, setInstalled] = useState(() => (typeof window === 'undefined' ? false : isStandaloneDisplay()))

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const isiOS = useMemo(
    () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !isStandaloneDisplay(),
    [],
  )

  const visible = !installed && !dismissed && (installEvent || isiOS)

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
    }
    setInstallEvent(null)
  }

  const dismiss = () => {
    localStorage.setItem('nclex-pwa-install-dismissed', 'true')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="mb-5 overflow-hidden rounded-[22px] border border-[var(--nclex-border)] bg-[var(--nclex-card)] p-4 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[var(--nclex-blue)] p-3 text-white shadow-[0_14px_30px_rgba(42,125,225,0.24)]">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
                  Mobile App Ready
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[var(--nclex-text)]">
                  Install Nurse Command on your phone.
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--nclex-text-muted)]">
                  Get an app icon, full-screen study sessions, faster repeat loading, and offline fallback for saved screens.
                  {isiOS ? ' On iPhone, tap Share, then Add to Home Screen.' : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {installEvent ? (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                >
                  <Download className="h-4 w-4" />
                  Install app
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismiss}
                className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                <X className="h-4 w-4" />
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
