import type { TycoonTask } from '../app/types'
import './tycoon-reference-art.css'

type PortraitSource = 'carter' | 'nguyen' | 'alvarez'

// The reference provides three patient portraits. Rooms 104–106 reuse those
// illustrations until distinct approved patient artwork is available.
const patientPortraits: Record<string, PortraitSource> = {
  'f-101': 'carter',
  'f-102': 'nguyen',
  'f-103': 'alvarez',
  'f-104': 'carter',
  'f-105': 'nguyen',
  'f-106': 'alvarez',
}

export function TycoonPortrait({ task }: { task: TycoonTask }) {
  const source = patientPortraits[task.patientId] ?? 'carter'

  return (
    <span
      className={`tycoon-reference-art tycoon-reference-portrait tycoon-reference-portrait--${source}`}
      aria-hidden="true"
    />
  )
}

export function TycoonLaunchLogo() {
  return <span className="tycoon-reference-art tycoon-reference-logo" aria-hidden="true" />
}

export function TycoonClinicImage() {
  return <span className="tycoon-reference-art tycoon-reference-clinic" aria-hidden="true" />
}
