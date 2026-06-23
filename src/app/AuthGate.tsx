import { motion } from 'framer-motion'
import { Cloud, Eye, EyeOff, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { examTracks } from '../data/exam-tracks'
import type { ExamTrackId } from './types'
import { useStudySystemStore } from './store'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const authInitialized = useStudySystemStore((state) => state.authInitialized)
  const authConfigured = useStudySystemStore((state) => state.authConfigured)
  const authUser = useStudySystemStore((state) => state.authUser)
  const passwordRecoveryRequired = useStudySystemStore((state) => state.passwordRecoveryRequired)
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

  if (authUser && passwordRecoveryRequired) {
    return <PasswordRecoveryLanding />
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
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [name, setName] = useState('')
  const [nursingSchool, setNursingSchool] = useState('')
  const [examTrack, setExamTrack] = useState<ExamTrackId>('nclex-rn')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'reset') {
        await requestPasswordReset(email)
        setMessage('Password reset email sent if that account exists. Open the link from that inbox to set a new password.')
      } else if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password, {
          name,
          nursingSchool: nursingSchool || undefined,
          examTrack,
        })
        setMessage('Verification email sent. Open it to finish creating your account, then sign in.')
      }
    } catch {
      // Store owns the visible error copy.
    } finally {
      setBusy(false)
    }
  }

  const changeMode = (nextMode: 'signin' | 'signup' | 'reset') => {
    setMode(nextMode)
    setMessage('')
  }

  const title = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'
  const submitLabel =
    mode === 'reset'
      ? 'Send password reset email'
      : mode === 'signin'
        ? 'Sign in and sync'
        : 'Send verification email'

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
              <p className="text-sm font-bold text-[var(--nclex-text)]">Nurse Command</p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--nclex-blue)]">Cloud Sync</p>
            </div>
          </div>
          <h1 className="mt-8 max-w-3xl font-serif text-4xl leading-tight text-[var(--nclex-text)] md:text-6xl">
            Your progress follows you now.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--nclex-text-muted)]">
            Create an account to sync Nurse Command exam prep, notes, flashcards, uploaded materials, and performance history across devices.
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
                {title}
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
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--nclex-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--nclex-blue)] focus:ring-4 focus:ring-blue-100"
                placeholder="you@example.com"
              />
            </label>
            {mode === 'signup' ? (
              <>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">Name</span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--nclex-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--nclex-blue)] focus:ring-4 focus:ring-blue-100"
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">School</span>
                  <input
                    type="text"
                    autoComplete="organization"
                    value={nursingSchool}
                    onChange={(event) => setNursingSchool(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--nclex-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--nclex-blue)] focus:ring-4 focus:ring-blue-100"
                    placeholder="Optional"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">Exam track</span>
                  <select
                    value={examTrack}
                    onChange={(event) => setExamTrack(event.target.value as ExamTrackId)}
                    className="mt-2 w-full rounded-2xl border border-[var(--nclex-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--nclex-blue)] focus:ring-4 focus:ring-blue-100"
                  >
                    {examTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.shortName}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            {mode !== 'reset' ? (
              <PasswordField
                label="Password"
                value={password}
                visible={passwordVisible}
                onVisibleChange={setPasswordVisible}
                onChange={setPassword}
                placeholder="At least 6 characters"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            ) : null}

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
              {busy ? 'Working...' : submitLabel}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => changeMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-sm font-semibold text-[var(--nclex-blue)]"
            >
              {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}
            </button>
            <button type="button" onClick={() => changeMode(mode === 'reset' ? 'signin' : 'reset')} className="text-sm font-semibold text-[var(--nclex-text-muted)]">
              {mode === 'reset' ? 'Back to sign in' : 'Reset password'}
            </button>
          </div>

          <div className="mt-6 rounded-[20px] border border-dashed border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
            <div className="flex items-start gap-3">
              <Cloud className="mt-1 h-5 w-5 text-[var(--nclex-blue)]" />
              <div>
                <p className="font-semibold text-[var(--nclex-text)]">Just previewing?</p>
                <p className="mt-1 text-sm leading-6 text-[var(--nclex-text-muted)]">
                  Continue in local demo mode. Your data stays on this device and will not be mixed into a cloud account automatically.
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

          <div className="mt-4 rounded-[18px] border border-[var(--nclex-border)] bg-white px-4 py-3 text-xs leading-5 text-[var(--nclex-text-muted)]">
            <p>
              By using Nurse Command, you agree to use it as practice study support, not clinical advice,
              licensure prediction, or a substitute for official NCLEX guidance.
            </p>
            <p className="mt-2">
              Privacy: cloud accounts store your email and synced study data. Do not upload protected health information.
              Support: <a className="font-semibold text-[var(--nclex-blue)]" href="mailto:support@cosmicgames.info">support@cosmicgames.info</a>.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function PasswordRecoveryLanding() {
  const updatePassword = useStudySystemStore((state) => state.updatePassword)
  const authError = useStudySystemStore((state) => state.authError)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await updatePassword(password)
    } catch {
      // Store owns the visible error copy.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nclex-shell-bg flex min-h-screen items-center justify-center px-5 py-8 text-[var(--nclex-text)]">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="nclex-surface w-full max-w-[460px] rounded-[28px] p-6 md:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
              Password Recovery
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">
              Set a new password
            </h2>
          </div>
          <div className="rounded-2xl bg-[var(--nclex-blue-soft)] p-3 text-[var(--nclex-blue)]">
            <LockKeyhole className="h-5 w-5" />
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <PasswordField
            label="New password"
            value={password}
            visible={passwordVisible}
            onVisibleChange={setPasswordVisible}
            onChange={setPassword}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            visible={passwordVisible}
            onVisibleChange={setPasswordVisible}
            onChange={setConfirmPassword}
            placeholder="Retype password"
            autoComplete="new-password"
          />
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
            {busy ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </motion.section>
    </div>
  )
}

function PasswordField({
  label,
  value,
  visible,
  onVisibleChange,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  value: string
  visible: boolean
  onVisibleChange: (value: boolean) => void
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">{label}</span>
      <div className="mt-2 flex overflow-hidden rounded-2xl border border-[var(--nclex-border)] bg-white focus-within:border-[var(--nclex-blue)] focus-within:ring-4 focus-within:ring-blue-100">
        <input
          type={visible ? 'text' : 'password'}
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => onVisibleChange(!visible)}
          className="inline-flex w-12 shrink-0 items-center justify-center text-[var(--nclex-text-muted)] transition hover:text-[var(--nclex-blue)]"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  )
}
