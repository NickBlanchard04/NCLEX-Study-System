import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type StudySelectOption = { value: string; label: string; artwork?: string; tone?: string }

export function StudySelect({ label, value, options, onChange, gallery = false }: { label: string; value: string; options: StudySelectOption[]; onChange: (value: string) => void; gallery?: boolean }) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState({ up: false, height: 320 })
  const selected = options.findIndex(option => option.value === value)
  const current = options[selected] ?? options[0]
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  useEffect(() => { if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active, open, id])
  function choose(index: number) { onChange(options[index].value); setOpen(false); trigger.current?.focus() }
  function reveal() {
    const rect = trigger.current?.getBoundingClientRect()
    if (rect) { const below = window.innerHeight - rect.bottom; const up = below < 220 && rect.top > below; setPlacement({ up, height: Math.max(120, Math.min(320, (up ? rect.top : below) - 16)) }) }
    setOpen(true)
  }
  return <div className={`study-select${gallery ? ' study-select-gallery' : ''}`} ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false) }}>
    <span className="study-select-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="study-select-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open ? `${id}-${active}` : undefined} data-tone={current.tone} onClick={() => { setActive(Math.max(0, selected)); if (open) setOpen(false); else reveal() }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) reveal(); setActive(open ? (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : Math.max(0, selected)) }
      else if (open && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(active) }
      else if (open && (event.key === 'Home' || event.key === 'End')) { event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1) }
      else if (event.key.length === 1 && event.key !== ' ') { const match = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase())); if (match >= 0) { setActive(match); if (!open) reveal() } }
    }}>
      {current.artwork && <img src={current.artwork} alt="" width="32" height="32" />}<span id={`${id}-value`}>{current.label}</span><ChevronDown size={18} aria-hidden="true" />
    </button>
    {open && <div className="study-select-menu" data-up={!gallery && placement.up} style={gallery ? undefined : { maxHeight: placement.height }} role="listbox" id={`${id}-list`} aria-labelledby={`${id}-label`}>
      {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value} className="study-select-option" data-active={index === active} data-tone={option.tone} onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
        {option.artwork && <img src={option.artwork} alt="" width="36" height="36" />}<span>{option.label}</span>{option.value === value && <Check size={18} aria-hidden="true" />}
      </div>)}
    </div>}
  </div>
}
