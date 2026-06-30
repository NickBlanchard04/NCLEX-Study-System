import { motion } from 'framer-motion'
import { Eye, EyeOff, FileText, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { examTracks } from '../data/exam-tracks'
import type { ExamTrackId } from './types'
import { useStudySystemStore } from './store'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import { createBetaTermsConsent } from './beta-terms'
import { trackAppEvent } from '../services/analytics-client'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const authInitialized = useStudySystemStore((state) => state.authInitialized)
  const authUser = useStudySystemStore((state) => state.authUser)
  const passwordRecoveryRequired = useStudySystemStore((state) => state.passwordRecoveryRequired)

  if (!authInitialized) {
    return (
      <div className="nurse-command-app flex min-h-screen items-center justify-center bg-[#04101f] p-6 text-white">
        <div className="rounded-[24px] border border-sky-300/20 bg-[#071d34]/78 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-sky-300/20 border-t-sky-300" />
          <p className="mt-4 text-sm font-semibold text-sky-100/70">Checking account status...</p>
        </div>
      </div>
    )
  }

  if (authUser && passwordRecoveryRequired) {
    return <PasswordRecoveryLanding />
  }

  if (authUser) {
    return children
  }

  return <AuthLanding />
}

function AuthLanding() {
  const authConfigured = useStudySystemStore((state) => state.authConfigured)
  const signIn = useStudySystemStore((state) => state.signIn)
  const signUp = useStudySystemStore((state) => state.signUp)
  const requestPasswordReset = useStudySystemStore((state) => state.requestPasswordReset)
  const authError = useStudySystemStore((state) => state.authError)
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [name, setName] = useState('')
  const [nursingSchool, setNursingSchool] = useState('')
  const [examTrack, setExamTrack] = useState<ExamTrackId | 'na'>('na')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsCopyRequested, setTermsCopyRequested] = useState(false)

  const agreementRequired = mode !== 'reset'
  const canSubmit = !busy && authConfigured && (!agreementRequired || termsAccepted)
  const inputClass =
    'mt-2 w-full rounded-2xl border border-sky-300/20 bg-[#04101f]/82 px-4 py-3 text-sm text-white outline-none transition placeholder:text-sky-100/34 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/16'

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    if (!authConfigured) {
      setMessage('Nurse Command beta access requires cloud authentication. Supabase is not configured in this build.')
      return
    }
    if (agreementRequired && !termsAccepted) {
      setMessage('Please accept the beta terms, privacy notice, and study-support limitations before continuing.')
      return
    }
    const trimmedName = name.trim()
    const trimmedSchool = nursingSchool.trim()
    if (mode === 'signup' && !trimmedSchool) {
      setMessage('Please enter your name and the college or nursing program you are in before continuing.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'reset') {
        await requestPasswordReset(email)
        setMessage('Password reset email sent if that account exists. Open the link from that inbox to set a new password.')
      } else if (mode === 'signin') {
        await signIn(email, password)
      } else {
        void trackAppEvent('signup_started', {
          page_path: '/',
          feature_name: 'Beta Account',
          exam_track: examTrack === 'na' ? undefined : examTrack,
        })
        await signUp(email, password, {
          name: trimmedName,
          nursingSchool: trimmedSchool,
          examTrack: examTrack === 'na' ? undefined : examTrack,
        }, createBetaTermsConsent(termsCopyRequested))
        setMessage(
          termsCopyRequested
            ? 'Verification email sent with a copy of the open beta terms. Open it to finish creating your account, then sign in.'
            : 'Verification email sent. Open it to finish creating your account, then sign in.',
        )
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
    if (nextMode !== 'signup') {
      setTermsCopyRequested(false)
    }
  }

  const title = mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create beta account' : 'Reset password'
  const submitLabel =
    mode === 'reset'
      ? 'Send password reset email'
      : mode === 'signin'
        ? 'Sign in'
        : 'Send verification email'

  return (
    <div className="nurse-command-app relative min-h-screen overflow-hidden bg-[#04101f] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_78%_22%,rgba(163,230,53,0.12),transparent_26%),linear-gradient(180deg,#071d34_0%,#04101f_52%,#020812_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.06)_1px,transparent_1px)] bg-[length:72px_72px] opacity-40" />
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 text-center lg:text-left"
        >
          <img
            src={nursingCommandLogo}
            alt="Nursing Command"
            className="mx-auto w-[min(18rem,78vw)] object-contain drop-shadow-[0_30px_80px_rgba(0,0,0,0.42)] lg:mx-0 lg:w-[24rem]"
          />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-lime-200/32 bg-lime-300/10 px-4 py-2 text-xs font-black uppercase tracking-normal text-lime-100">
            <ShieldCheck className="h-4 w-4" />
            Open beta testing
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
            Welcome to Nurse Command.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-sky-50/76 lg:mx-0">
            A free timesaving nursing study command center for focused practice, weak-area repair, performance signals, and study materials in one place.
          </p>
          <div id="beta-terms" className="mx-auto mt-7 max-w-2xl rounded-2xl border border-cyan-200/18 bg-[#071d34]/68 p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:mx-0">
            <p className="text-sm font-black text-white">Open beta notice</p>
            <p className="mt-2 text-sm leading-7 text-sky-100/68">
              Nurse Command is currently in open beta. Features, content, analytics, and availability may change while we test and improve the product.
            </p>
            <p className="mt-3 text-sm leading-7 text-sky-100/68">
              By accessing the beta, users agree not to copy, scrape, reverse engineer, resell, redistribute, or use Nurse Command content or interface patterns to train or build competing systems.
            </p>
            <p className="mt-3 text-sm leading-7 text-sky-100/68">
              Nurse Command is study support only. It is not clinical advice, patient care guidance, licensure prediction, or a substitute for official exam guidance.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-[28px] border border-cyan-200/20 bg-[#071d34]/88 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur md:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-cyan-200/72">
                Beta account access
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                {title}
              </h2>
            </div>
            <div className="rounded-2xl border border-cyan-200/24 bg-cyan-300/10 p-3 text-cyan-100">
              {mode === 'signup' ? <UserPlus className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
            </div>
          </div>
          {!authConfigured ? (
            <div className="mt-5 rounded-2xl border border-amber-200/30 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Cloud authentication is required for beta access. This build is missing Supabase configuration.
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-normal text-sky-100/58">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </label>
            {mode === 'signup' ? (
              <>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-normal text-sky-100/58">Name</span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-normal text-sky-100/58">College / nursing program</span>
                  <input
                    type="text"
                    required
                    autoComplete="organization"
                    value={nursingSchool}
                    onChange={(event) => setNursingSchool(event.target.value)}
                    className={inputClass}
                    placeholder="Your college or nursing program"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-normal text-sky-100/58">Exam track</span>
                  <select
                    value={examTrack}
                    onChange={(event) => setExamTrack(event.target.value as ExamTrackId | 'na')}
                    className={inputClass}
                  >
                    <option value="na">N/A / just exploring</option>
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
                tone="dark"
              />
            ) : null}
            {agreementRequired ? (
              <label className="flex cursor-pointer gap-3 rounded-2xl border border-cyan-200/18 bg-[#04101f]/58 p-4">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-cyan-300"
                />
                <span className="text-sm leading-6 text-sky-100/70">
                  I agree to the beta terms, privacy notice, and study-support limitations. I understand Nurse Command may change during open beta and that account access is required.
                </span>
              </label>
            ) : null}
            {mode === 'signup' ? (
              <label className="flex cursor-pointer gap-3 rounded-2xl border border-lime-200/18 bg-lime-300/8 p-4">
                <input
                  type="checkbox"
                  checked={termsCopyRequested}
                  onChange={(event) => setTermsCopyRequested(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-lime-300"
                />
                <span className="text-sm leading-6 text-sky-100/72">
                  <span className="font-black text-white">Email me a copy of these terms.</span> Include the current open beta terms in my verification email.
                </span>
              </label>
            ) : null}

            {authError || message ? (
              <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-sky-50/80">
                {authError ?? message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="nclex-btn-primary flex min-h-[48px] w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? 'Working...' : submitLabel}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => changeMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-sm font-bold text-cyan-200"
            >
              {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}
            </button>
            <button type="button" onClick={() => changeMode(mode === 'reset' ? 'signin' : 'reset')} className="text-sm font-bold text-sky-100/60">
              {mode === 'reset' ? 'Back to sign in' : 'Reset password'}
            </button>
          </div>

          <div className="mt-6 rounded-[18px] border border-sky-200/14 bg-[#04101f]/56 px-4 py-3 text-xs leading-5 text-sky-100/56">
            <div className="mb-2 flex items-center gap-2 text-sky-100/78">
              <FileText className="h-4 w-4" />
              <p className="font-black uppercase tracking-normal">Privacy and terms summary</p>
            </div>
            <p>
              Privacy: cloud accounts store your email and synced study activity. Do not upload protected health information, patient-identifying data, or clinical records.
            </p>
            <p className="mt-2">
              Terms: beta access is personal. Do not copy, scrape, reverse engineer, redistribute, resell, or train competing systems from Nurse Command content, interfaces, or study logic.
            </p>
            <p className="mt-2">
              Support: <a className="font-semibold text-cyan-200" href="mailto:support@nursecommand.com">support@nursecommand.com</a>.
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
  tone = 'light',
}: {
  label: string
  value: string
  visible: boolean
  onVisibleChange: (value: boolean) => void
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
  tone?: 'light' | 'dark'
}) {
  const isDark = tone === 'dark'

  return (
    <label className="block">
      <span className={isDark ? 'text-xs font-black uppercase tracking-normal text-sky-100/58' : 'text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]'}>{label}</span>
      <div className={isDark ? 'mt-2 flex overflow-hidden rounded-2xl border border-sky-300/20 bg-[#04101f]/82 focus-within:border-cyan-200/70 focus-within:ring-4 focus-within:ring-cyan-300/16' : 'mt-2 flex overflow-hidden rounded-2xl border border-[var(--nclex-border)] bg-white focus-within:border-[var(--nclex-blue)] focus-within:ring-4 focus-within:ring-blue-100'}>
        <input
          type={visible ? 'text' : 'password'}
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={isDark ? 'min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-sky-100/34' : 'min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none'}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => onVisibleChange(!visible)}
          className={isDark ? 'inline-flex w-12 shrink-0 items-center justify-center text-sky-100/58 transition hover:text-cyan-200' : 'inline-flex w-12 shrink-0 items-center justify-center text-[var(--nclex-text-muted)] transition hover:text-[var(--nclex-blue)]'}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  )
}
