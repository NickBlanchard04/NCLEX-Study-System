import type React from 'react'
import { clsx } from 'clsx'
import {
  CoolArrowRight,
  CoolFirstAid,
  CoolFlag,
  CoolShield,
  CoolStar,
  CoolTimer,
  CoolUpload,
} from './coolicons'

type CommandTone = 'blue' | 'green' | 'amber' | 'orange' | 'violet'

const toneColor: Record<CommandTone, string> = {
  blue: '#38bdf8',
  green: '#34d399',
  amber: '#fbbf24',
  orange: '#fb923c',
  violet: '#a78bfa',
}

export function NurseCommandBackdrop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('relative overflow-hidden bg-[#04101f] text-[#d8ecff]', className)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_8%,rgba(38,139,255,0.22),transparent_28%),radial-gradient(circle_at_18%_72%,rgba(0,184,255,0.12),transparent_26%),linear-gradient(180deg,#071629_0%,#04101f_45%,#020812_100%)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(88,169,255,0.32)_1px,transparent_1px),linear-gradient(90deg,rgba(88,169,255,0.28)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(48,145,255,0.25),transparent)]" />
        <div className="absolute inset-y-[11%] left-0 w-[30%] bg-[linear-gradient(90deg,rgba(20,184,255,0.2),rgba(20,184,255,0.05),transparent)] opacity-70" />
        <div className="absolute bottom-[8%] right-0 h-[58%] w-[34%] bg-[linear-gradient(115deg,transparent,rgba(147,197,253,0.1)_44%,rgba(14,165,233,0.18))] opacity-80" />
        <div className="absolute bottom-0 left-0 h-[26%] w-full bg-[linear-gradient(180deg,transparent,rgba(2,8,18,0.88))]" />
        <div className="absolute bottom-0 right-0 h-[58%] w-[48%] bg-[radial-gradient(circle_at_70%_65%,rgba(80,177,255,0.16),transparent_36%)]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export function CommandBrand({
  compact = false,
  label = 'Nurse Command',
}: {
  compact?: boolean
  label?: string
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-16 w-16 place-items-center rounded-[1.25rem] border border-cyan-300/40 bg-[#071d34]/90 shadow-[0_0_34px_rgba(43,148,255,0.34)]">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(180deg,#0f7aff,#062d63)] text-white">
          <CoolFirstAid className="h-7 w-7" />
        </div>
      </div>
      <div>
        <p className={clsx('font-black uppercase tracking-[0.16em] text-white drop-shadow-[0_0_16px_rgba(144,204,255,0.58)]', compact ? 'text-lg' : 'text-2xl')}>
          {label}
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.42em] text-sky-200/80">
          Study. Practice. Lead.
        </p>
      </div>
    </div>
  )
}

export function CommandPanel({
  title,
  subtitle,
  children,
  className,
  compact = false,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <section className={clsx('rounded-[1.15rem] border border-sky-300/22 bg-[#071d34]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_34px_rgba(0,0,0,0.18)] backdrop-blur', compact ? 'p-3' : 'p-4', className)}>
      <div className={clsx('flex items-center justify-between gap-3 border-b border-sky-300/14', compact ? 'mb-2 pb-2' : 'mb-4 pb-3')}>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky-100/76">{title}</p>
        {subtitle ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-300">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function CommandHud({
  label,
  value,
  progress,
  icon,
}: {
  label: string
  value: string
  progress: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-[#071d34]/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-3">
        <CommandIconBubble size="sm">{icon}</CommandIconBubble>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">{label}</p>
          <p className="truncate text-xs text-sky-200/70">{value}</p>
        </div>
      </div>
      <CommandProgress value={progress} className="mt-3" />
    </div>
  )
}

export function CommandIconBubble({
  children,
  size = 'md',
  tone = 'blue',
}: {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  tone?: CommandTone
}) {
  const sizeClass = size === 'sm' ? 'h-9 w-9 rounded-xl' : size === 'lg' ? 'h-14 w-14 rounded-full' : 'h-12 w-12 rounded-2xl'
  return (
    <div
      className={clsx('grid shrink-0 place-items-center border bg-white/[0.06] shadow-[inset_0_0_20px_rgba(45,151,255,0.14),0_0_18px_rgba(45,151,255,0.16)]', sizeClass)}
      style={{ borderColor: `${toneColor[tone]}55`, color: toneColor[tone] }}
    >
      {children}
    </div>
  )
}

export function CommandProgress({ value, className, tone = 'blue' }: { value: number; className?: string; tone?: CommandTone }) {
  return (
    <div className={clsx('h-2 overflow-hidden rounded-full bg-sky-300/14', className)}>
      <div
        className="h-full rounded-full shadow-[0_0_14px_currentColor]"
        style={{
          width: `${Math.max(4, Math.min(100, value))}%`,
          background: `linear-gradient(90deg, ${toneColor[tone]}, #55c6ff)`,
          color: toneColor[tone],
        }}
      />
    </div>
  )
}

export function CommandRing({
  value,
  label,
  tone = 'blue',
  size = 'md',
}: {
  value: number
  label: string
  tone?: CommandTone
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass = size === 'sm' ? 'w-14' : size === 'lg' ? 'w-36' : 'w-32'
  const innerClass = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-[74%] w-[74%]' : 'h-[74%] w-[74%]'
  return (
    <div
      className={clsx('grid aspect-square place-items-center rounded-full shadow-[0_0_28px_rgba(43,148,255,0.22)]', sizeClass)}
      style={{ background: `conic-gradient(${toneColor[tone]} ${Math.max(0, Math.min(100, value)) * 3.6}deg, rgba(148,213,255,0.12) 0deg)` }}
    >
      <div className={clsx('grid place-items-center rounded-full bg-[#071d34] text-center', innerClass)}>
        <div>
          <p className={clsx('font-black text-white', size === 'sm' ? 'text-sm' : 'text-3xl')}>{value}%</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/64">{label}</p>
        </div>
      </div>
    </div>
  )
}

export function EcgLine({ className }: { className?: string }) {
  return (
    <svg className={clsx('text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.75)]', className)} viewBox="0 0 280 80" aria-hidden="true">
      <path
        d="M0 43 H85 L101 43 L112 18 L124 65 L137 43 H173 L183 43 L195 4 L210 76 L223 43 H280"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
    </svg>
  )
}

export function EcgTrace({ className }: { className?: string }) {
  return (
    <svg className={clsx('text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.65)]', className)} viewBox="0 0 260 80" aria-hidden="true">
      <path
        d="M0 52 H34 L43 25 L53 65 L65 52 H96 L105 52 L116 18 L127 72 L137 52 H170 L180 52 L190 35 L202 58 L213 52 H260"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  )
}

export function MiniActivityChart({ className, compact = false }: { className?: string; compact?: boolean }) {
  const points = [24, 42, 33, 58, 45, 63, 76]
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * 35 + 8} ${84 - point}`).join(' ')
  return (
    <div className={className}>
      <p className={clsx('text-xs font-bold uppercase tracking-[0.14em] text-sky-200/58', compact ? 'mb-1' : 'mb-2')}>Weekly activity</p>
      <svg className={clsx('w-full overflow-visible text-sky-400', compact ? 'h-14' : 'h-24')} viewBox="0 0 250 92" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={line} x1="0" x2="250" y1={line * 20 + 8} y2={line * 20 + 8} stroke="rgba(125,211,252,0.12)" />
        ))}
        <path d={path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {points.map((point, index) => (
          <circle key={point + index} cx={index * 35 + 8} cy={84 - point} r="4" fill="#93c5fd" />
        ))}
      </svg>
    </div>
  )
}

export function MasteryDial({
  label,
  value,
  tone = 'blue',
}: {
  label: string
  value: number
  tone?: CommandTone
}) {
  return (
    <div className="text-center">
      <CommandRing value={value} label="" tone={tone} size="sm" />
      <p className="mt-2 truncate text-xs font-semibold text-sky-100/72">{label}</p>
    </div>
  )
}

export function CommandChip({
  children,
  tone = 'blue',
}: {
  children: React.ReactNode
  tone?: CommandTone
}) {
  return (
    <span
      className="rounded-full border bg-white/[0.04] px-4 py-2 text-sm font-semibold"
      style={{ borderColor: `${toneColor[tone]}55`, color: toneColor[tone] }}
    >
      {children}
    </span>
  )
}

export function CommandMetricCard({
  label,
  value,
  detail,
  icon,
  tone = 'blue',
}: {
  label: string
  value: string
  detail: string
  icon?: React.ReactNode
  tone?: CommandTone
}) {
  return (
    <div className="rounded-2xl border border-sky-300/22 bg-[#071d34]/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-3">
        {icon ? <CommandIconBubble size="sm" tone={tone}>{icon}</CommandIconBubble> : null}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-200/62">{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-sky-100/64">{detail}</p>
    </div>
  )
}

export function GameActionTile({
  number,
  title,
  description,
  stat,
  progress,
  icon,
  tone = 'blue',
  active,
  onSelect,
  className,
}: {
  number: number
  title: string
  description: string
  stat: string
  progress: number
  icon: React.ReactNode
  tone?: 'blue' | 'green' | 'amber'
  active?: boolean
  onSelect: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'group relative h-full min-h-0 overflow-hidden rounded-[1.15rem] border bg-[#071d34]/74 p-[clamp(14px,1vw,18px)] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_38px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-sky-200/70 hover:shadow-[0_0_42px_rgba(43,148,255,0.26)]',
        active ? 'border-sky-200 shadow-[0_0_0_1px_rgba(79,195,255,0.7),0_0_34px_rgba(43,148,255,0.58)]' : 'border-sky-300/25',
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_38%,rgba(47,150,255,0.18),transparent_32%),linear-gradient(135deg,rgba(15,122,255,0.08),transparent_50%)] opacity-90" />
      <div className="absolute right-4 top-4 text-[clamp(46px,3.4vw,66px)] font-black leading-none text-white/90 drop-shadow-[0_0_16px_rgba(109,197,255,0.42)]">
        {number}
      </div>
      <div className="relative z-10 flex h-full flex-col justify-between gap-4">
        <div className="flex items-start gap-4 pr-16">
          <CommandIconBubble size="lg">{icon}</CommandIconBubble>
          <div className="min-w-0">
            <h2 className="text-[clamp(21px,1.45vw,28px)] font-black leading-none text-white">{title}</h2>
            <p className="mt-3 overflow-hidden text-sm leading-5 text-sky-100/68 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{description}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold" style={{ color: toneColor[tone] }}>{stat}</span>
            <CoolArrowRight className="h-6 w-6 text-white transition group-hover:translate-x-1" />
          </div>
          <CommandProgress value={progress} tone={tone} className="mt-3" />
        </div>
      </div>
    </button>
  )
}

export function MaterialUploadAsset({
  active,
  onBrowse,
}: {
  active?: boolean
  onBrowse: () => void
}) {
  return (
    <button
      type="button"
      onClick={onBrowse}
      className={clsx(
        'w-full rounded-2xl border border-dashed p-5 text-left transition hover:-translate-y-0.5',
        active
          ? 'border-sky-200 bg-sky-400/20 shadow-[0_0_24px_rgba(56,189,248,0.25)]'
          : 'border-sky-300/30 bg-white/[0.04] hover:border-sky-200/70',
      )}
    >
      <div className="flex items-center gap-4">
        <CommandIconBubble tone="blue">
          <CoolUpload className="h-6 w-6" />
        </CommandIconBubble>
        <div>
          <p className="font-bold text-white">Drop files here or click to upload</p>
          <p className="mt-1 text-sm text-sky-200/66">PDF, DOCX, TXT, or MD. Review before saving.</p>
        </div>
      </div>
    </button>
  )
}

export function UtilityBadge({
  label,
  value,
  icon,
  tone = 'blue',
}: {
  label: string
  value: string
  icon?: React.ReactNode
  tone?: CommandTone
}) {
  return (
    <div className="rounded-2xl border border-sky-300/22 bg-[#071d34]/70 p-4 text-center">
      <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-white/[0.06]" style={{ color: toneColor[tone] }}>
        {icon ?? <CoolStar className="h-5 w-5" />}
      </div>
      <p className="text-sm font-semibold text-sky-100/72">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}

export function BottomCommandButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.12em] transition',
        active
          ? 'bg-sky-400/12 text-white shadow-[inset_0_-3px_0_#1d9bff,0_0_20px_rgba(43,148,255,0.24)]'
          : 'text-sky-100/58 hover:bg-sky-400/10 hover:text-white',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function NurseCommandAssetStrip({
  accuracy,
  streak,
  focusTime,
}: {
  accuracy: number
  streak: number
  focusTime: string
}) {
  return (
    <NurseCommandBackdrop className="rounded-[1.25rem] border border-sky-300/20">
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.2fr_1fr]">
        <CommandPanel title="System Status" subtitle="Operational">
          <div className="flex items-end justify-between gap-4">
            <EcgTrace className="h-20 flex-1" />
            <div className="text-right">
              <p className="text-3xl font-black text-sky-300">72</p>
              <p className="text-xs uppercase tracking-[0.16em] text-sky-200/65">BPM</p>
            </div>
          </div>
        </CommandPanel>
        <CommandPanel title="Mastery Overview" subtitle="Live">
          <div className="grid grid-cols-4 gap-3">
            <MasteryDial label="Med Surg" value={Math.max(60, accuracy)} tone="green" />
            <MasteryDial label="Pharm" value={Math.max(45, accuracy - 5)} tone="blue" />
            <MasteryDial label="Peds" value={Math.max(40, accuracy - 12)} tone="amber" />
            <MasteryDial label="Mental" value={Math.max(35, accuracy - 18)} tone="orange" />
          </div>
        </CommandPanel>
        <CommandPanel title="Utility Badges" subtitle="Ready">
          <div className="grid grid-cols-3 gap-3">
            <UtilityBadge label="Streak" value={`${streak} Days`} icon={<CoolFlag className="h-5 w-5" />} tone="orange" />
            <UtilityBadge label="Focus Time" value={focusTime} icon={<CoolTimer className="h-5 w-5" />} tone="blue" />
            <UtilityBadge label="Accuracy" value={`${accuracy}%`} icon={<CoolShield className="h-5 w-5" />} tone="green" />
          </div>
        </CommandPanel>
      </div>
    </NurseCommandBackdrop>
  )
}
