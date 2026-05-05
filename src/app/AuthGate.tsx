import { motion } from 'framer-motion'
import { Cloud, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useStudySystemStore } from './store'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const authInitialized = useStudySystemStore((state) => state.authInitialized)
  const authConfigured = useStudySystemStore((state) => state.authConfigured)
  const authUser = useStudySystemStore((state) => state.authUser)
  const isDemoMode = useStudySystemStore((state) => state.isDemoMode)

  if (!authInitialized) {
    return (
      <div className="nclex-shell-bg flex min-h-screen items-center justify-center p-6">
        <div className="nclex-surface rounded-[24px] p-6 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--nclex-blue-soft)] border-t-[var(--nclex-blue)]" />
          <p className="mt-4 text-sm font-semibold text-[var(--nclex-text-muted)]">Checking account status...</p>
        </div>
      </div>
    )
  }

  if (authUser || isDemoMode || !authConfigured) {
    return children
  }

  return <AuthLanding />
}

function AuthLanding() {
  const signIn = useStudySystemStore((state) => state.signIn)
  const signUp = useStudySystemStore((state) => state.signUp)
  const requestPasswordReset = useStudySystemStore((state) => state.requestPasswordReset)
  const continueAsDemo = useStudySystemStore((state) => state.continueAsDemo)
  const authError = useStudySystemStore((state) => state.authError)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setMessage('Account created. If your Supabase project requires email confirmation, check your inbox before signing in.')
      }
    } catch {
      // Store owns the visible error copy.
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    if (!email) {
      setMessage('Enter your email first, then request a reset link.')
      return
    }
    setBusy(true)
    try {
      await requestPasswordReset(email)
      setMessage('Password reset email sent if that account exists.')
    } catch {
      // Store owns the visible error copy.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nclex-shell-bg min-h-screen px-5 py-8 text-[var(--nclex-text)]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-[var(--nclex-border)] bg-[radial-gradient(circle_at_18%_18%,rgba(42,125,225,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#eef5ff_100%)] p-7 shadow-[0_24px_70px_rgba(15,37,61,0.1)] md:p-10"
        >
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--nclex-blue)] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--nclex-text)]">NCLEX Study System</p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--nclex-blue)]">Cloud Sync</p>
            </div>
          </div>
          <h1 className="mt-8 max-w-3xl font-serif text-4xl leading-tight text-[var(--nclex-text)] md:text-6xl">
            Your progress follows you now.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--nclex-text-muted)]">
            Create an account to sync exam prep, notes, flashcards, uploaded materials, and performance history across devices.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['Secure accounts', 'Supabase Auth with user-owned data.'],
              ['Cloud progress', 'Attempts, notes, cards, and materials sync.'],
              ['SaaS-ready', 'RLS policies and storage paths are already scoped.'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[20px] border border-white bg-white/80 p-4 shadow-sm">
                <p className="font-semibold text-[var(--nclex-text)]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">{copy}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="nclex-surface rounded-[28px] p-6 md:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
                Account Access
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </h2>
            </div>
            <div className="rounded-2xl bg-[var(--nclex-blue-soft)] p-3 text-[var(--nclex-blue)]">
              {mode === 'signin' ? <LockKeyhole className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--nclex-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--nclex-blue)] focus:ring-4 focus:ring-blue-100"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--nclex-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--nclex-blue)] focus:ring-4 focus:ring-blue-100"
                placeholder="At least 6 characters"
              />
            </label>

            {authError || message ? (
              <div className="rounded-2xl border border-[#d4e4f7] bg-[var(--nclex-blue-soft)] px-4 py-3 text-sm leading-6 text-[var(--nclex-text-secondary)]">
                {authError ?? message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="nclex-btn-primary flex min-h-[48px] w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Working...' : mode === 'signin' ? 'Sign in and sync' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm font-semibold text-[var(--nclex-blue)]"
            >
              {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
            </button>
            <button type="button" onClick={resetPassword} className="text-sm font-semibold text-[var(--nclex-text-muted)]">
              Reset password
            </button>
          </div>

          <div className="mt-6 rounded-[20px] border border-dashed border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
            <div className="flex items-start gap-3">
              <Cloud className="mt-1 h-5 w-5 text-[var(--nclex-blue)]" />
              <div>
                <p className="font-semibold text-[var(--nclex-text)]">Just previewing?</p>
                <p className="mt-1 text-sm leading-6 text-[var(--nclex-text-muted)]">
                  Continue in local demo mode. Your data stays on this device until you sign in and import it.
                </p>
                <button
                  type="button"
                  onClick={continueAsDemo}
                  className="mt-3 rounded-xl border border-[var(--nclex-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--nclex-blue)]"
                >
                  Continue local demo
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
