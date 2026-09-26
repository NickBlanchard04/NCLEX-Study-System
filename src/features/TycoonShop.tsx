import { useEffect, useRef, useState } from 'react'
import { Check, LockKeyhole, X } from 'lucide-react'
import { useStudySystemStore } from '../app/store'
import type { TycoonGameState, TycoonUpgrade } from '../app/types'
import { tycoonUpgrades } from '../data/tycoon'
import { getUpgradeCost } from '../services/tycoon-engine'
import './tycoon-shop.css'

const columns = [
  { title: 'Ward', id: 'extra-bed' },
  { title: 'Monitoring', id: 'vitals-monitor' },
  { title: 'Charting', id: 'ehr-station' },
  { title: 'Safety', id: 'med-safety-scanner' },
] as const
const team = ['lab-runner', 'staff-training', 'simulation-room'] as const
const roman = ['I', 'II', 'III']
const items = new Map(tycoonUpgrades.map((item) => [item.id, item]))
const effects: Record<string, { value: string; label: string }> = {
  'extra-bed': { value: '+1', label: 'Patient next shift' },
  'vitals-monitor': { value: '−3', label: 'Deterioration penalty' },
  'ehr-station': { value: '−4 min', label: 'Documentation tasks' },
  'med-safety-scanner': { value: '+$35', label: 'Medication-check rewards' },
  'lab-runner': { value: '−4 min', label: 'Vitals tasks' },
  'staff-training': { value: '+8', label: 'Staff energy buffer' },
  'simulation-room': { value: '+4 XP', label: 'Completed care' },
}
type Selection = { id: string; tier?: number }
const price = (amount: number) => `$${amount.toLocaleString()}`

export function TycoonShop({ tycoon, onClose }: { tycoon: TycoonGameState; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selection, setSelection] = useState<Selection>(() => ({ id: 'vitals-monitor', tier: Math.min(3, (tycoon.upgrades['vitals-monitor'] ?? 0) + 1) }))
  const [receipt, setReceipt] = useState('')
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  const item = items.get(selection.id)!
  const level = tycoon.upgrades[item.id] ?? 0
  const tier = selection.tier ?? Math.min(level + 1, item.maxLevel)
  const cost = getUpgradeCost(item.cost, tier - 1)
  const installed = level >= tier
  const locked = tier > level + 1
  const affordable = tycoon.money >= cost
  const canBuy = !installed && !locked && affordable
  const effect = effects[item.id]

  function purchase(upgrade: TycoonUpgrade, targetTier: number) {
    const store = useStudySystemStore.getState()
    const owned = store.tycoon.upgrades[upgrade.id] ?? 0
    const amount = getUpgradeCost(upgrade.cost, owned)
    // A tier remains inspectable, but only the next tier may spend currency.
    if (targetTier !== owned + 1 || owned >= upgrade.maxLevel || store.tycoon.money < amount) return
    store.purchaseTycoonUpgrade(upgrade.id)
    if ((useStudySystemStore.getState().tycoon.upgrades[upgrade.id] ?? 0) === targetTier) {
      setReceipt(`${upgrade.name} ${roman[targetTier - 1]} installed · ${price(amount)} spent`)
    }
  }

  function tile(upgrade: TycoonUpgrade, targetTier?: number) {
    const owned = tycoon.upgrades[upgrade.id] ?? 0
    const rank = targetTier ?? Math.min(owned + 1, upgrade.maxLevel)
    const amount = getUpgradeCost(upgrade.cost, rank - 1)
    const done = owned >= rank, future = rank > owned + 1, short = tycoon.money < amount
    const active = selection.id === upgrade.id && selection.tier === targetTier
    const name = `${upgrade.name}${targetTier ? ` ${roman[rank - 1]}` : ''}`
    const state = done ? 'Installed' : future ? `Requires level ${rank - 1}` : short ? `Need ${price(amount - tycoon.money)} more` : `Buy for ${price(amount)}`
    const choose = () => setSelection({ id: upgrade.id, tier: targetTier })
    return <button type="button" key={`${upgrade.id}-${targetTier ?? 'next'}`}
      className={`tycoon-shop-tile${active ? ' is-selected' : ''}${done ? ' is-installed' : ''}${future ? ' is-locked' : ''}${short && !done && !future ? ' is-unaffordable' : ''}`}
      aria-label={`${name} · ${state}`} aria-pressed={active} aria-disabled={done || future || short}
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') choose() }} onFocus={choose}
      onKeyDown={(event) => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault() }}
      onClick={() => { choose(); purchase(upgrade, rank) }}>
      {done || future ? <span className="tycoon-shop-tile-state" aria-hidden="true">{done ? <Check /> : <LockKeyhole />}</span> : null}
      <img src={`/game-assets/tycoon-shop/${upgrade.id}.png`} alt="" draggable={false} />
      <span className="tycoon-shop-tile-copy"><strong>{name}</strong><span className="tycoon-shop-price">{done ? 'Owned' : price(amount)}</span>
        {!targetTier ? <LevelPips level={owned} max={upgrade.maxLevel} /> : null}
      </span>
    </button>
  }

  return <dialog ref={dialogRef} className="tycoon-shop" aria-labelledby="tycoon-shop-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="tycoon-shop-header">
      <h2 id="tycoon-shop-title">Unit shop</h2>
      <p className="tycoon-shop-funds"><strong>{price(tycoon.money)}</strong><span>Available</span></p>
      <button type="button" className="tycoon-shop-close" onClick={onClose} aria-label="Close shop"><kbd>I</kbd><span>Close</span><X aria-hidden="true" /></button>
    </header>
    <div className="tycoon-shop-body">
      <div className="tycoon-shop-equipment">
        {columns.map((column) => {
          const upgrade = items.get(column.id)!
          return <section className="tycoon-shop-column" key={column.id} aria-label={column.title}>
            <h3>{column.title}</h3>
            <div className="tycoon-shop-tiers">{Array.from({ length: upgrade.maxLevel }, (_, i) => tile(upgrade, i + 1))}</div>
          </section>
        })}
      </div>
      <aside className="tycoon-shop-detail" aria-label="Selected upgrade">
        <h3>{item.name}</h3>
        <img src={`/game-assets/tycoon-shop/${item.id}.png`} alt={item.name} draggable={false} />
        <div className="tycoon-shop-level"><span>Level {level} / {item.maxLevel}</span><LevelPips level={level} max={item.maxLevel} /></div>
        <p className="tycoon-shop-description">{item.description}</p>
        <div className="tycoon-shop-effect"><strong>{effect.value}</strong><span>{effect.label}<small>Per level</small></span></div>
        <p className="tycoon-shop-availability">{installed ? level >= item.maxLevel ? 'Fully upgraded' : `Tier ${roman[tier - 1]} installed` : locked ? `Install tier ${roman[tier - 2]} first` : !affordable ? `Need ${price(cost - tycoon.money)} more` : item.id === 'extra-bed' ? 'Room opens to patients next shift' : 'Ready to install in your ward'}</p>
        <button type="button" className="tycoon-shop-buy" disabled={!canBuy} onClick={() => purchase(item, tier)}>{installed ? 'Owned' : locked ? 'Locked' : `Buy ${price(cost)}`}</button>
      </aside>
      <section className="tycoon-shop-team" aria-labelledby="tycoon-shop-team-title">
        <h3 id="tycoon-shop-team-title">Team &amp; training</h3>
        <div>{team.map((id) => tile(items.get(id)!))}</div>
      </section>
    </div>
    <footer className="tycoon-shop-footer">
      <p role="status">{receipt || 'Select equipment to inspect · Click an available tier to purchase'}</p>
      <span>{tycoon.activeShift?.status === 'running' ? 'Shift paused' : 'Unit upgrades'}</span>
    </footer>
  </dialog>
}

function LevelPips({ level, max }: { level: number; max: number }) {
  return <span className="tycoon-shop-pips" aria-label={`Level ${level} of ${max}`}>
    {Array.from({ length: max }, (_, i) => <span key={i} className={i < level ? 'is-filled' : ''} />)}
  </span>
}
