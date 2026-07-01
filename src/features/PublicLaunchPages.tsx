import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import { trackAppEvent } from '../services/analytics-client'

type PublicPageKey = 'pricing' | 'nclex-rn' | 'nclex-pn' | 'about' | 'privacy' | 'terms'

type PublicPage = {
  key: PublicPageKey
  path: `/${string}`
  eyebrow: string
  title: string
  description: string
  bullets: string[]
  sections: Array<{
    title: string
    body: string
  }>
  ctaLabel: string
  ctaPath: string
}

const publicPages: Record<PublicPageKey, PublicPage> = {
  pricing: {
    key: 'pricing',
    path: '/pricing',
    eyebrow: 'Open beta pricing',
    title: 'Focused NCLEX prep without enterprise bloat.',
    description:
      'Nurse Command is built for nursing students who need practice, remediation, and study momentum in one clear workspace.',
    bullets: ['Open beta access', 'NCLEX-RN and NCLEX-PN tracks', 'Practice analytics and remediation'],
    ctaLabel: 'Start studying',
    ctaPath: '/',
    sections: [
      {
        title: 'What is included',
        body: 'Adaptive practice, exam-style sessions, flashcards, uploaded-material study tools, weak-area review, and progress dashboards are included in the launch experience.',
      },
      {
        title: 'Who it is for',
        body: 'Use it when you want a practical study command center for nursing exams, not a pile of disconnected notes, files, and question attempts.',
      },
      {
        title: 'Beta posture',
        body: 'Launch pricing and packaging can change as the product matures. The current goal is to validate learning value before adding noisy plan tiers.',
      },
    ],
  },
  'nclex-rn': {
    key: 'nclex-rn',
    path: '/nclex-rn',
    eyebrow: 'NCLEX-RN prep',
    title: 'Train for RN judgment, prioritization, and safe decisions.',
    description:
      'Nurse Command helps NCLEX-RN learners practice clinical judgment, review weak areas, and turn each missed question into a next action.',
    bullets: ['RN-focused categories', 'Readiness and weak-area signals', 'Remediation after practice'],
    ctaLabel: 'Open RN study mode',
    ctaPath: '/',
    sections: [
      {
        title: 'RN practice focus',
        body: 'Practice covers prioritization, delegation, safety, pharmacology, med-surg, maternal-newborn, pediatrics, mental health, and clinical judgment cues.',
      },
      {
        title: 'Learning loop',
        body: 'Each session feeds dashboards, weak-area prompts, and review tools so your next study block is based on evidence instead of guesswork.',
      },
      {
        title: 'Study support',
        body: 'Nurse Command is practice support. It does not guarantee licensure outcomes or replace your school, instructor, or official exam guidance.',
      },
    ],
  },
  'nclex-pn': {
    key: 'nclex-pn',
    path: '/nclex-pn',
    eyebrow: 'NCLEX-PN prep',
    title: 'Build PN exam confidence with focused practice and review.',
    description:
      'Use Nurse Command to organize PN practice, reinforce fundamentals, and keep remediation tied to the topics that need attention.',
    bullets: ['PN-focused practice', 'Daily study plan signals', 'Flashcards, notes, and uploaded materials'],
    ctaLabel: 'Open PN study mode',
    ctaPath: '/',
    sections: [
      {
        title: 'PN practice focus',
        body: 'Review safety, basic care, pharmacology, adult health, maternal-newborn, pediatrics, psychosocial integrity, and practical nursing priorities.',
      },
      {
        title: 'Repeatable routine',
        body: 'Plan a session, answer questions, review the rationale, and come back to the weak-area work that matters most.',
      },
      {
        title: 'Clear boundaries',
        body: 'The app supports studying and practice reflection. It is not clinical advice, school recordkeeping, or a substitute for official NCLEX resources.',
      },
    ],
  },
  about: {
    key: 'about',
    path: '/about',
    eyebrow: 'About Nurse Command',
    title: 'A study command center for nursing students.',
    description:
      'Nurse Command brings practice questions, remediation, study planning, flashcards, notes, and material review into one calm workflow.',
    bullets: ['Built around study behavior', 'Designed for repeated practice', 'Privacy-aware analytics'],
    ctaLabel: 'Explore the app',
    ctaPath: '/',
    sections: [
      {
        title: 'Why it exists',
        body: 'Nursing students often study across scattered PDFs, notes, videos, and question banks. Nurse Command gives that work a single operating surface.',
      },
      {
        title: 'How it works',
        body: 'The app turns practice history into dashboards, weak-area recommendations, study plans, and review tools you can return to every day.',
      },
      {
        title: 'What we measure',
        body: 'Product analytics are limited to aggregate acquisition and learning-flow signals. Personal study details stay inside the product workflow.',
      },
    ],
  },
  privacy: {
    key: 'privacy',
    path: '/privacy',
    eyebrow: 'Privacy overview',
    title: 'Privacy-conscious study analytics for launch.',
    description:
      'Nurse Command uses analytics to understand aggregate product behavior while keeping private study content out of Google tracking.',
    bullets: ['No PHI uploads', 'No raw notes in Google events', 'Supabase remains the study data source of truth'],
    ctaLabel: 'Return to Nurse Command',
    ctaPath: '/',
    sections: [
      {
        title: 'Study data',
        body: 'Accounts may store study progress, attempts, notes, flashcards, materials, and preferences so the app can restore your learning workflow.',
      },
      {
        title: 'Analytics boundary',
        body: 'Google analytics events are limited to approved page, signup, demo, quiz, pricing, and CTA signals. Emails, names, notes, filenames, tokens, and raw uploaded content are not sent as Google event parameters.',
      },
      {
        title: 'User responsibility',
        body: 'Do not upload patient identifiers, protected health information, school records, clinical records, or other sensitive third-party information.',
      },
    ],
  },
  terms: {
    key: 'terms',
    path: '/terms',
    eyebrow: 'Terms overview',
    title: 'Study support, not licensure guarantees.',
    description:
      'Nurse Command is an educational practice tool for nursing students. It supports studying, reflection, and exam preparation workflows.',
    bullets: ['Practice tool only', 'No clinical advice', 'No licensure guarantee'],
    ctaLabel: 'Start with the app',
    ctaPath: '/',
    sections: [
      {
        title: 'Educational use',
        body: 'Use Nurse Command for practice, study planning, review, and self-assessment. Always defer to official exam bodies, instructors, programs, and licensed professionals.',
      },
      {
        title: 'Content limitations',
        body: 'Practice questions, rationales, analytics, and generated study materials can contain errors or omissions and should be reviewed with appropriate judgment.',
      },
      {
        title: 'Beta changes',
        body: 'Features, availability, pricing, and policies can change during launch and beta as Nurse Command improves.',
      },
    ],
  },
}

const iconCards = [
  { label: 'Practice', icon: ClipboardList },
  { label: 'Review', icon: BookOpenCheck },
  { label: 'Readiness', icon: Target },
  { label: 'Judgment', icon: BrainCircuit },
]

const normalizePath = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

const pageFromPath = (pathname: string) => {
  const normalized = normalizePath(pathname)
  return Object.values(publicPages).find((page) => page.path === normalized) ?? publicPages.about
}

function usePublicPageMeta(page: PublicPage) {
  useEffect(() => {
    const title = `${page.title} | Nurse Command`
    const canonicalUrl = `https://nursecommand.com${page.path}`
    document.title = title

    const upsertMeta = (selector: string, create: () => HTMLMetaElement | HTMLLinkElement) => {
      const existing = document.head.querySelector(selector)
      if (existing) return existing
      const next = create()
      document.head.appendChild(next)
      return next
    }

    const description = upsertMeta('meta[name="description"]', () => {
      const meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      return meta
    }) as HTMLMetaElement
    description.setAttribute('content', page.description)

    const canonical = upsertMeta('link[rel="canonical"]', () => {
      const link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      return link
    }) as HTMLLinkElement
    canonical.setAttribute('href', canonicalUrl)

    void trackAppEvent('page_view', {
      page_path: page.path,
      feature_name: `Public ${page.key}`,
      is_demo_user: true,
    })

    if (page.key === 'pricing') {
      void trackAppEvent('pricing_viewed', {
        page_path: page.path,
        feature_name: 'Public pricing',
        is_demo_user: true,
      })
    }
  }, [page])
}

export function PublicLaunchPage() {
  const location = useLocation()
  const page = pageFromPath(location.pathname)
  usePublicPageMeta(page)

  return (
    <main className="min-h-screen bg-[#04101f] text-white">
      <header className="border-b border-white/10 bg-[#061426]/92">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={nursingCommandLogo} alt="Nurse Command" className="h-11 w-11 rounded-2xl object-contain" />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100">Nurse Command</p>
              <p className="text-xs font-semibold text-sky-100/58">NCLEX study system</p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-sky-100/72">
            <PublicNavLink to="/nclex-rn" label="NCLEX-RN" />
            <PublicNavLink to="/nclex-pn" label="NCLEX-PN" />
            <PublicNavLink to="/pricing" label="Pricing" />
            <PublicNavLink to="/about" label="About" />
          </nav>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">{page.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.95] tracking-normal text-white md:text-6xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-sky-100/74 md:text-lg">
            {page.description}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to={page.ctaPath}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-[#04101f] shadow-[0_0_30px_rgba(103,232,249,0.22)] transition hover:bg-cyan-200"
            >
              {page.ctaLabel}
              <Sparkles className="h-4 w-4" />
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-100/20 bg-white/[0.055] px-5 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100/40 hover:bg-white/[0.08]"
            >
              Privacy boundary
              <ShieldCheck className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {page.bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-2 rounded-2xl border border-cyan-100/14 bg-cyan-300/[0.055] p-3 text-sm font-semibold text-sky-50/86">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 rounded-[2rem] border border-cyan-100/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(6,20,38,0.9)_48%,rgba(4,16,31,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] md:grid-cols-2">
          {iconCards.map(({ label, icon: Icon }) => (
            <div key={label} className="min-h-[128px] rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-4">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100/22 bg-cyan-300/[0.11] text-cyan-100">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-lg font-black text-white">{label}</p>
              <p className="mt-1 text-sm leading-6 text-sky-100/62">
                Built into the same learning loop.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-8 md:grid-cols-3 md:px-8">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-[1.25rem] border border-cyan-100/14 bg-[#071d34]/76 p-5">
              <h2 className="text-xl font-black tracking-normal text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-sky-100/70">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-sky-100/58 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-cyan-200" />
          <span>Nurse Command is study support, not clinical advice or a licensure guarantee.</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/privacy" className="hover:text-cyan-100">Privacy</Link>
          <Link to="/terms" className="hover:text-cyan-100">Terms</Link>
          <Link to="/about" className="hover:text-cyan-100">About</Link>
        </div>
      </footer>
    </main>
  )
}

function PublicNavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="rounded-xl px-3 py-2 transition hover:bg-white/[0.07] hover:text-white">
      {label}
    </Link>
  )
}
