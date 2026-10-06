export type CareIconKind = 'patient' | 'equipment' | 'safety'
const CARE_ICON_FILES = {patient:'assess-patient',equipment:'check-monitor',safety:'bedside-safety'} as const

/** The same small SVGs are used by React actions and Phaser floor markers. */
export function TycoonInteractionIcon({kind, size=24}: {kind:CareIconKind; size?:number}) {
  return <img className="tycoon-interaction-icon" src={`/game-assets/interaction-icons/${CARE_ICON_FILES[kind]}.svg`} width={size} height={size} alt="" aria-hidden="true" />
}
