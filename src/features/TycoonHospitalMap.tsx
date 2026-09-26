import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react'
import { MousePointer2, Pause, Play } from 'lucide-react'
import type { TycoonTask } from '../app/types'
import type { TycoonWard } from '../game/tycoon-ward-scene'
import type { WardState, WardStatus, WardTarget } from '../game/tycoon-ward'
import { CARE_LABELS, nextCareStep } from '../services/tycoon-care'

export type WardMapHandle = { goTo: (id: string) => boolean }
type Props = {
  ref?: Ref<WardMapHandle>
  shiftId: string
  tasks: TycoonTask[]
  selectedTaskId?: string
  reviewedTaskIds: string[]
  upgrades: Record<string, number>
  onOpenShop: () => void
  onNearbyTask: (id: string | null) => void
  paused: boolean
  manuallyPaused: boolean
  onTogglePause: () => void
  onInteract: (target: WardTarget) => void
}

export function TycoonHospitalMap({ ref, shiftId, tasks, selectedTaskId, reviewedTaskIds, upgrades, paused, manuallyPaused, onTogglePause, onInteract, onOpenShop, onNearbyTask }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const hospitalRef = useRef<TycoonWard | null>(null)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [status, setStatus] = useState<WardStatus | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const snapshot: WardState = { shiftId, tasks, selectedTaskId, reviewedTaskIds, upgrades, paused, reducedMotion }
  const latest = useRef({ snapshot, onInteract, onNearbyTask })
  const lastNearby = useRef<string | null>(null)
  useImperativeHandle(ref, () => ({ goTo: (id) => hospitalRef.current?.goTo(id) ?? false }), [])

  useLayoutEffect(() => {
    latest.current = { snapshot, onInteract, onNearbyTask }
    hospitalRef.current?.update(snapshot)
  })
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const parent = hostRef.current
    if (!parent) return
    let disposed = false
    let hospital: TycoonWard | undefined
    void import('../game/tycoon-ward-scene').then(({ createTycoonWard }) => {
      if (disposed) return
      hospital = createTycoonWard({
        parent,
        onInteract: (target) => latest.current.onInteract(target),
        onStatus: (next) => {
          if (disposed) return
          setStatus(next)
          const id = next.nearby?.taskId ?? null
          if (lastNearby.current !== id) { lastNearby.current = id; latest.current.onNearbyTask(id) }
        },
        onError: () => { if (!disposed) setError(true) },
      })
      hospitalRef.current = hospital
      hospital.update(latest.current.snapshot)
    }).catch(() => { if (!disposed) setError(true) })
    return () => { disposed = true; hospitalRef.current = null; hospital?.destroy() }
  }, [attempt])

  const nearbyTask = tasks.find((task) => task.id === status?.nearby?.taskId)
  const nearbyStep = nearbyTask ? nextCareStep(nearbyTask) : null
  const bedsideLabel = nearbyStep === 'assessment' || nearbyStep === 'care' || nearbyStep === 'reassessment' ? CARE_LABELS[nearbyStep] : 'Patient details'
  const interactionLabel = status?.caring ? 'Caring…' : status?.nearby?.kind === 'station' ? 'Handoff' : status?.nearby?.kind === 'equipment' ? 'Check monitor' : status?.nearby?.kind === 'safety' ? 'Safety check' : nearbyTask ? bedsideLabel : 'Interact'
  return (
    <div className="tycoon-hospital" data-care-phase={status?.caring ? 'caring' : status?.moving ? 'walking' : 'ready'}>
      <div ref={hostRef} className="tycoon-hospital-canvas" aria-hidden="true" />
      {error ? (
        <div className="tycoon-hospital-error" role="alert">
          <p>The ward could not load. Reload to restore movement.</p>
          <button type="button" onClick={() => { setError(false); setAttempt((v) => v + 1) }}>Reload ward</button>
        </div>
      ) : null}
      <div className="tycoon-movement" role="group" aria-label="Game controls">
        <p className="tycoon-movement-status" role="status" aria-live="polite">{error ? 'Map unavailable' : status?.label ?? 'Preparing the ward…'}</p>
        <div className="tycoon-movement-row">
          <div className="tycoon-input-hints" aria-label="WASD or arrow keys to move; click the floor to walk">
            <span className="tycoon-key-hint" aria-hidden="true">
              <span className="tycoon-key-cluster"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>
              <span>Move</span>
            </span>
            <span className="tycoon-key-hint" aria-hidden="true"><MousePointer2 /><span>Walk</span></span>
          </div>
          <div className="tycoon-dpad" role="group" aria-label="Nurse movement">
            {([
              ['up', '↑', 0, -1], ['left', '←', -1, 0], ['down', '↓', 0, 1], ['right', '→', 1, 0],
            ] as const).map(([name, label, x, y]) => (
              <button key={name} type="button" className={`move-${name}`} aria-label={`Move ${name}`} disabled={paused || error || !status}
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); hospitalRef.current?.setDirection(x, y) }}
                onPointerUp={() => hospitalRef.current?.setDirection(0, 0)}
                onPointerCancel={() => hospitalRef.current?.setDirection(0, 0)}
                onLostPointerCapture={() => hospitalRef.current?.setDirection(0, 0)}
                onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); hospitalRef.current?.setDirection(x, y) } }}
                onKeyUp={() => hospitalRef.current?.setDirection(0, 0)}
                onBlur={() => hospitalRef.current?.setDirection(0, 0)}
              >{label}</button>
            ))}
          </div>
          <button type="button" className="tycoon-interact" disabled={paused || !status?.nearby || status.caring} onClick={() => hospitalRef.current?.interact()}>
            <kbd aria-hidden="true">E</kbd>
            <span>{interactionLabel}</span>
          </button>
          <button type="button" className="tycoon-shop-key" onClick={onOpenShop} aria-label="Open shop"><kbd aria-hidden="true">I</kbd><span>Shop</span></button>
          <button type="button" className="tycoon-pause" onClick={onTogglePause} aria-label={manuallyPaused ? 'Resume' : 'Pause'} title={manuallyPaused ? 'Resume' : 'Pause'} aria-pressed={manuallyPaused}>
            {manuallyPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  )
}
