import { motion } from 'framer-motion'
import {
  Apple,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStudySystemStore } from './store'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import { createBetaTermsConsent } from './beta-terms'
import { trackAppEvent } from '../services/analytics-client'
import { examTracks } from '../data/exam-tracks'
import type { ExamTrackId, StudyIntensity } from './types'

type AuthMode = 'welcome' | 'signin' | 'signup' | 'reset'

const studyIntensityOptions: Array<{
  value: StudyIntensity
  label: string
  detail: string
}> = [
  { value: 'steady', label: 'Steady', detail: 'Light daily practice' },
  { value: 'focused', label: 'Focused', detail: 'Balanced study rhythm' },
  { value: 'accelerated', label: 'Accelerated', detail: 'Higher-intensity prep' },
]

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
    return <ProfileOnboardingGate>{children}</ProfileOnboardingGate>
  }

  return <AuthLanding />
}

function ProfileOnboardingGate({ children }: { children: React.ReactNode }) {
  const authUser = useStudySystemStore((state) => state.authUser)
  const isDemoMode = useStudySystemStore((state) => state.isDemoMode)
  const profile = useStudySystemStore((state) => state.profile)
  const updateProfile = useStudySystemStore((state) => state.updateProfile)
  const [nursingSchool, setNursingSchool] = useState(profile.nursingSchool ?? '')
  const [examTrack, setExamTrack] = useState<ExamTrackId>(profile.examTrack ?? 'nclex-rn')
  const [examDate, setExamDate] = useState(profile.examDate)
  const [studyIntensity, setStudyIntensity] = useState<StudyIntensity>(profile.studyIntensity)

  const hasRequiredSetup =
    Boolean(profile.nursingSchool?.trim()) &&
    Boolean(profile.examTrack) &&
    Boolean(profile.examDate) &&
    Boolean(profile.studyIntensity)
  const needsOnboarding =
    Boolean(authUser) &&
    !isDemoMode &&
    !profile.preferences.onboardingCompletedAt &&
    !hasRequiredSetup

  useEffect(() => {
    if (!needsOnboarding) return
    void trackAppEvent(
      'onboarding_started',
      {
        page_path: '/onboarding',
        exam_track: profile.examTrack ?? 'nclex-rn',
        feature_name: 'Profile Setup',
      },
      { userId: authUser?.id, isDemoUser: false },
    )
  }, [authUser?.id, needsOnboarding, profile.examTrack])

  const completeOnboarding = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const completedAt = new Date().toISOString()
    updateProfile({
      nursingSchool: nursingSchool.trim(),
      examTrack,
      examDate,
      studyIntensity,
      preferences: {
        ...profile.preferences,
        onboardingCompletedAt: completedAt,
      },
    })
    void trackAppEvent(
      'onboarding_completed',
      {
        page_path: '/onboarding',
        exam_track: examTrack,
        feature_name: 'Profile Setup',
        metadata: {
          has_school: Boolean(nursingSchool.trim()),
          has_goal_date: Boolean(examDate),
          study_intensity: studyIntensity,
        },
      },
      { userId: authUser?.id, isDemoUser: false },
    )
  }

  const skipOnboarding = () => {
    const completedAt = new Date().toISOString()
    updateProfile({
      preferences: {
        ...profile.preferences,
        onboardingCompletedAt: completedAt,
      },
    })
    void trackAppEvent(
      'onboarding_completed',
      {
        page_path: '/onboarding',
        exam_track: profile.examTrack ?? 'nclex-rn',
        feature_name: 'Profile Setup',
        metadata: { skipped: true },
      },
      { userId: authUser?.id, isDemoUser: false },
    )
  }

  if (!needsOnboarding) return children

  const inputClass =
    'mt-2 w-full rounded-2xl border border-sky-300/20 bg-[#04101f]/82 px-4 py-3 text-sm text-white outline-none transition placeholder:text-sky-100/34 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/16'

  return (
    <div className="nurse-command-app relative min-h-screen overflow-x-hidden bg-[#04101f] px-4 py-6 font-['Google_Sans','Product_Sans','Inter',sans-serif] text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_78%_22%,rgba(163,230,53,0.12),transparent_26%),linear-gradient(180deg,#071d34_0%,#04101f_52%,#020812_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.06)_1px,transparent_1px)] bg-[length:72px_72px] opacity-40" />
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(360px,0.62fr)]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 text-center lg:text-left"
        >
          <img
            src={nursingCommandLogo}
            alt="Nursing Command"
            className="mx-auto w-[min(17rem,76vw)] object-contain drop-shadow-[0_30px_80px_rgba(0,0,0,0.42)] lg:mx-0 lg:w-[22rem]"
          />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/28 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-normal text-cyan-100">
            <ShieldCheck className="h-4 w-4" />
            Profile setup
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
            Set your study command center.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-sky-50/76 lg:mx-0">
            A few details help Nurse Command point your dashboard, study plan, and practice tools at the right exam path.
          </p>
          <div className="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-3 lg:mx-0">
            {studyIntensityOptions.map((option) => (
              <div key={option.value} className="rounded-2xl border border-sky-300/18 bg-white/[0.04] p-4">
                <p className="font-black text-white">{option.label}</p>
                <p className="mt-1 text-sm font-semibold text-sky-100/62">{option.detail}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mx-auto w-full max-w-[460px] rounded-[32px] border border-cyan-200/20 bg-[#071d34]/88 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur md:p-7"
        >
          <p className="text-xs font-black uppercase tracking-normal text-cyan-200/72">
            After verification
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-white">
            Finish profile setup
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-sky-100/66">
            You can change this later in Settings. No patient or private school records.
          </p>

          <form onSubmit={completeOnboarding} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-normal text-sky-100/58">
                School or program
              </span>
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
              <span className="text-xs font-black uppercase tracking-normal text-sky-100/58">
                Exam track
              </span>
              <select
                value={examTrack}
                onChange={(event) => setExamTrack(event.target.value as ExamTrackId)}
                className={inputClass}
              >
                {examTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.shortName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-normal text-sky-100/58">
                Goal date
              </span>
              <input
                type="date"
                required
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-xs font-black uppercase tracking-normal text-sky-100/58">
                Study intensity
              </legend>
              <div className="grid gap-2">
                {studyIntensityOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-cyan-200/16 bg-[#04101f]/58 p-4 text-sm transition has-[:checked]:border-cyan-200/60 has-[:checked]:bg-cyan-300/10"
                  >
                    <span>
                      <span className="block font-black text-white">{option.label}</span>
                      <span className="mt-1 block font-semibold text-sky-100/56">{option.detail}</span>
                    </span>
                    <input
                      type="radio"
                      name="study-intensity"
                      value={option.value}
                      checked={studyIntensity === option.value}
                      onChange={() => setStudyIntensity(option.value)}
                      className="h-5 w-5 accent-cyan-300"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              className="group flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-lime-200/24 bg-[linear-gradient(135deg,#0ea5e9,#14b8a6)] px-5 py-3 text-sm font-black text-white shadow-[0_18px_42px_rgba(14,165,233,0.24)] transition hover:[transform:translateY(-2px)] hover:border-lime-200/60 hover:brightness-110 hover:shadow-[0_24px_60px_rgba(20,184,166,0.34)] focus:outline-none focus:ring-4 focus:ring-lime-200/18"
            >
              Finish setup
              <ArrowRight className="h-4 w-4 transition group-hover:[transform:translateX(4px)]" />
            </button>
            <button
              type="button"
              onClick={skipOnboarding}
              className="mx-auto flex min-h-11 items-center justify-center px-4 text-sm font-black text-cyan-200 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
            >
              Skip for now
            </button>
          </form>
        </motion.section>
      </div>
    </div>
  )
}

function AuthLanding() {
  const authConfigured = useStudySystemStore((state) => state.authConfigured)
  const signIn = useStudySystemStore((state) => state.signIn)
  const signUp = useStudySystemStore((state) => state.signUp)
  const requestPasswordReset = useStudySystemStore((state) => state.requestPasswordReset)
  const authError = useStudySystemStore((state) => state.authError)
  const [mode, setMode] = useState<AuthMode>('welcome')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsCopyRequested, setTermsCopyRequested] = useState(false)

  const agreementRequired = mode === 'signup'
  const canSubmit = mode !== 'welcome' && !busy && authConfigured && (!agreementRequired || termsAccepted)
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
    if (mode === 'signup' && !trimmedName) {
      setMessage('Please enter your name before continuing.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'reset') {
        await requestPasswordReset(email)
        setMessage('Password reset email sent if that account exists. Open the link from that inbox to set a new password.')
      } else if (mode === 'signin') {
        await signIn(email, password)
      } else if (mode === 'signup') {
        void trackAppEvent('signup_started', {
          page_path: '/',
          feature_name: 'Beta Account',
        })
        await signUp(email, password, {
          name: trimmedName,
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

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setMessage('')
    setPasswordVisible(false)
    if (nextMode !== 'signup') {
      setTermsAccepted(false)
      setTermsCopyRequested(false)
    }
  }

  const title =
    mode === 'welcome'
      ? 'Welcome to Nurse Command'
      : mode === 'signin'
        ? 'Sign in'
        : mode === 'signup'
          ? 'Create account'
          : 'Reset password'
  const eyebrow = mode === 'reset' ? 'Account recovery' : 'Beta account access'
  const helperText =
    mode === 'welcome'
      ? 'We are excited to help you track progress, repair weak areas, and study from your own materials.'
      : mode === 'signin'
        ? 'Welcome back to Nurse Command.'
        : mode === 'signup'
          ? 'Start a clean beta profile. We will send a verification email before your account is active.'
          : 'Enter the email linked to your account and we will send a secure reset link.'
  const submitLabel =
    mode === 'reset'
      ? 'Send password reset email'
      : mode === 'signin'
        ? 'Sign in'
        : 'Create account'
  const formIcon =
    mode === 'signup'
      ? <UserPlus className="h-5 w-5" />
      : mode === 'reset'
        ? <Mail className="h-5 w-5" />
        : <LockKeyhole className="h-5 w-5" />

  return (
    <div className="nurse-command-app relative min-h-screen overflow-x-hidden bg-[#04101f] px-4 py-6 font-['Google_Sans','Product_Sans','Inter',sans-serif] text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_78%_22%,rgba(163,230,53,0.12),transparent_26%),linear-gradient(180deg,#071d34_0%,#04101f_52%,#020812_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.06)_1px,transparent_1px)] bg-[length:72px_72px] opacity-40" />
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="order-2 min-w-0 text-center lg:order-1 lg:text-left"
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
          <details id="beta-terms" className="mx-auto mt-7 max-w-2xl rounded-2xl border border-cyan-200/18 bg-[#071d34]/68 p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition open:border-cyan-200/28 lg:mx-0">
            <summary className="cursor-pointer text-sm font-black text-white">
              Open beta notice
            </summary>
            <div className="mt-3 space-y-3 text-sm leading-7 text-sky-100/68">
              <p>
                Nurse Command is currently in open beta. Features, content, analytics, and availability may change while we test and improve the product.
              </p>
              <p>
                By accessing the beta, users agree not to copy, scrape, reverse engineer, resell, redistribute, or use Nurse Command content or interface patterns to train or build competing systems.
              </p>
              <p>
                Nurse Command is study support only. It is not clinical advice, patient care guidance, licensure prediction, or a substitute for official exam guidance.
              </p>
            </div>
          </details>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="order-1 mx-auto w-full max-w-[430px] rounded-[32px] border border-cyan-200/20 bg-[#071d34]/88 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur md:p-7 lg:order-2"
        >
          <div className="mb-7 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={nursingCommandLogo}
                alt="Nurse Command"
                className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_12px_32px_rgba(14,165,233,0.32)]"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase tracking-[0.18em] text-white">
                  Nurse Command
                </p>
                <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/56">
                  Study. Practice. Lead.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-200/24 bg-cyan-300/10 p-3 text-cyan-100">
              {formIcon}
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-cyan-200/72">
                {eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-white">
                {title}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-sky-100/66">
            {helperText}
          </p>

          {mode === 'welcome' ? (
            <div className="mt-8 space-y-5">
              <button
                type="button"
                onClick={() => changeMode('signin')}
                className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-[#0e638d] px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(14,99,141,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1181b8] focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => changeMode('signup')}
                className="group mx-auto flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black text-cyan-200 transition hover:[transform:translateY(-2px)] hover:text-white focus:outline-none focus:ring-4 focus:ring-lime-200/14"
              >
                Create an account
                <ArrowRight className="h-4 w-4 transition group-hover:[transform:translateX(4px)]" />
              </button>
            </div>
          ) : null}

          {!authConfigured ? (
            <div className="mt-5 rounded-2xl border border-amber-200/30 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Cloud authentication is required for beta access. This build is missing Supabase configuration.
            </div>
          ) : null}

          {mode !== 'welcome' ? (
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
              {mode === 'signin' ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => changeMode('reset')}
                    className="min-h-11 text-xs font-black text-cyan-200 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                  >
                    Forgot password?
                  </button>
                </div>
              ) : null}
              {mode === 'signup' ? (
                <>
                  <div className="rounded-2xl border border-cyan-200/16 bg-cyan-300/8 px-4 py-3 text-sm leading-6 text-sky-100/70">
                    We will send a verification email. Your account starts with a clean profile after verification.
                  </div>
                  <label className="flex cursor-pointer gap-3 rounded-2xl border border-cyan-200/18 bg-[#04101f]/58 p-4">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-1 h-5 w-5 shrink-0 accent-cyan-300"
                    />
                    <span className="text-sm leading-6 text-sky-100/70">
                      I agree to the beta terms, privacy notice, and study-support limitations.
                    </span>
                  </label>
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
                </>
              ) : null}

              {authError || message ? (
                <div role="status" className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-sky-50/80">
                  {authError ?? message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className={mode === 'signup'
                  ? 'group flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-lime-200/24 bg-[linear-gradient(135deg,#0ea5e9,#14b8a6)] px-5 py-3 text-sm font-black text-white shadow-[0_18px_42px_rgba(14,165,233,0.24)] transition hover:[transform:translateY(-2px)] hover:border-lime-200/60 hover:brightness-110 hover:shadow-[0_24px_60px_rgba(20,184,166,0.34)] focus:outline-none focus:ring-4 focus:ring-lime-200/18 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-500/70 disabled:opacity-45 disabled:shadow-none disabled:hover:transform-none disabled:hover:brightness-100'
                  : 'group flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0e638d] px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(14,99,141,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1181b8] focus:outline-none focus:ring-4 focus:ring-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0'}
              >
                {busy ? 'Working...' : submitLabel}
                {!busy ? <ArrowRight className="h-4 w-4 transition group-hover:[transform:translateX(4px)]" /> : null}
              </button>
            </form>
          ) : null}

          {mode === 'signin' ? (
            <>
              <div className="my-5 flex items-center gap-3 text-[11px] font-black uppercase tracking-normal text-sky-100/42">
                <span className="h-px flex-1 bg-cyan-200/16" />
                Social sign-in
                <span className="h-px flex-1 bg-cyan-200/16" />
              </div>
              <div className="space-y-3">
                <ProviderButton provider="Google" />
                <ProviderButton provider="Apple" />
              </div>
              <p className="mt-3 text-center text-xs font-semibold leading-5 text-sky-100/50">
                Google and Apple sign-in are coming soon. Use email and password for beta access.
              </p>
            </>
          ) : null}

          {mode !== 'welcome' ? (
            <div className="mt-5 flex justify-center">
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => changeMode('signup')}
                  className="min-h-11 text-sm font-black text-cyan-200 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                >
                  Create an account
                </button>
              ) : null}
              {mode === 'signup' ? (
                <button
                  type="button"
                  onClick={() => changeMode('signin')}
                  className="min-h-11 text-sm font-black text-cyan-200 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                >
                  Already have an account? Sign in
                </button>
              ) : null}
              {mode === 'reset' ? (
                <button
                  type="button"
                  onClick={() => changeMode('signin')}
                  className="min-h-11 text-sm font-black text-cyan-200 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                >
                  Back to sign in
                </button>
              ) : null}
            </div>
          ) : null}

          <details className="mt-6 rounded-[18px] border border-sky-200/14 bg-[#04101f]/56 px-4 py-3 text-xs leading-5 text-sky-100/56 transition open:border-cyan-200/24">
            <summary className="flex cursor-pointer items-center gap-2 text-sky-100/78">
              <FileText className="h-4 w-4" />
              <span className="font-black uppercase tracking-normal">Privacy and terms summary</span>
            </summary>
            <div className="mt-3 space-y-2">
              <p>
                Privacy: cloud accounts store your email and synced study activity. Do not upload protected health information, patient-identifying data, or clinical records.
              </p>
              <p>
                Terms: beta access is personal. Do not copy, scrape, reverse engineer, redistribute, resell, or train competing systems from Nurse Command content, interfaces, or study logic.
              </p>
              <p>
                Support: <a className="font-semibold text-cyan-200" href="mailto:support@nursecommand.com">support@nursecommand.com</a>.
              </p>
            </div>
          </details>
        </motion.section>
      </div>
    </div>
  )
}

function ProviderButton({ provider }: { provider: 'Google' | 'Apple' }) {
  return (
    <button
      type="button"
      disabled
      aria-label={`${provider} sign-in coming soon`}
      className="flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-3 rounded-2xl border border-sky-100/12 bg-white/80 px-4 text-sm font-bold text-slate-900 shadow-[0_12px_26px_rgba(0,0,0,0.14)]"
    >
      {provider === 'Google' ? (
        <span aria-hidden="true" className="grid h-4 w-4 place-items-center text-sm font-black text-[#4285f4]">G</span>
      ) : (
        <Apple aria-hidden="true" className="h-4 w-4" />
      )}
      <span className="min-w-0 flex-1 text-left">Continue with {provider}</span>
      <span className="rounded-full bg-slate-900/10 px-2 py-1 text-[10px] font-black uppercase tracking-normal text-slate-700">
        Coming soon
      </span>
    </button>
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
    <div className="nurse-command-app relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04101f] px-5 py-8 font-['Google_Sans','Product_Sans','Inter',sans-serif] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.22),transparent_30%),linear-gradient(180deg,#071d34_0%,#04101f_52%,#020812_100%)]" />
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[460px] rounded-[28px] border border-cyan-200/20 bg-[#071d34]/88 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur md:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-cyan-200/72">
              Password Recovery
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              Set a new password
            </h2>
          </div>
          <div className="rounded-2xl border border-cyan-200/24 bg-cyan-300/10 p-3 text-cyan-100">
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
            tone="dark"
          />
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            visible={passwordVisible}
            onVisibleChange={setPasswordVisible}
            onChange={setConfirmPassword}
            placeholder="Retype password"
            autoComplete="new-password"
            tone="dark"
          />
          {authError || message ? (
            <div role="status" className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-sky-50/80">
              {authError ?? message}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0e638d] px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(14,99,141,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1181b8] focus:outline-none focus:ring-4 focus:ring-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
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
