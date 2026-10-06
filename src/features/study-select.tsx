import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

export type StudySelectOption = { value: string; label: string; artwork?: string; icon?: ReactNode; tone?: string }

export function StudySelect({ label, value, options, onChange, gallery = false, inline = label === 'Category' || label === 'Questions' }: { label: string; value: string; options: StudySelectOption[]; onChange: (value: string) => void; gallery?: boolean; inline?: boolean }) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const overlay = !inline && (gallery || options.some(option => option.artwork || option.icon))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState({ up: false, height: 320 })
  const selected = options.findIndex(option => option.value === value)
  const current = options[selected] ?? options[0]
  useEffect(() => {
    if (!open) return
    if (overlay) return
    const dismiss = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('click', dismiss)
    return () => document.removeEventListener('click', dismiss)
  }, [open, overlay])
  useEffect(() => {
    if (!open || !overlay) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    dialog.current?.focus()
    return () => { document.body.style.overflow = previousOverflow; trigger.current?.focus() }
  }, [open, overlay])
  useEffect(() => { if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active, open, id])
  function choose(index: number) { onChange(options[index].value); setOpen(false); trigger.current?.focus() }
  function reveal() {
    const section = root.current?.closest('section')
    // Top-level selectors replace More options; its own filters keep it expanded.
    section?.querySelectorAll<HTMLDetailsElement>('.simple-study-details[open]').forEach(details => {
      if (!details.contains(root.current)) details.open = false
    })
    const rect = trigger.current?.getBoundingClientRect()
    if (rect) { const below = window.innerHeight - rect.bottom; const up = below < 220 && rect.top > below; setPlacement({ up, height: Math.max(120, Math.min(320, (up ? rect.top : below) - 16)) }) }
    setOpen(true)
  }
  return <div className={`study-select${inline ? ' study-select-inline' : gallery ? ' study-select-gallery' : ''}`} ref={root} onBlur={event => { if (!overlay && !event.currentTarget.contains(event.relatedTarget as Node)) requestAnimationFrame(() => { if (!root.current?.contains(document.activeElement)) setOpen(false) }) }}>
    <span className="study-select-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="study-select-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open ? `${id}-${active}` : undefined} data-tone={current.tone} onClick={() => { setActive(Math.max(0, selected)); if (open) setOpen(false); else reveal() }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) reveal(); setActive(open ? (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : Math.max(0, selected)) }
      else if (open && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(active) }
      else if (open && (event.key === 'Home' || event.key === 'End')) { event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1) }
      else if (event.key.length === 1 && event.key !== ' ') { const match = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase())); if (match >= 0) { setActive(match); if (!open) reveal() } }
    }}>
      {current.artwork && <img src={current.artwork} alt="" width="32" height="32" />}{current.icon}<span id={`${id}-value`}>{current.label}</span><ChevronDown size={18} aria-hidden="true" />
    </button>
    {open && overlay && <dialog ref={dialog} className="study-picker" aria-labelledby={`${id}-picker-title`} tabIndex={-1} onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false) } }} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); setActive((active + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length) }
      else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1) }
      else if ((event.target === event.currentTarget || (event.target as HTMLElement).closest('[role="option"]')) && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(active) }
    }}>
      <header className="study-picker-header"><h2 id={`${id}-picker-title`}>{label === 'Category' ? 'Choose a category' : label === 'System' ? 'Choose a system' : label === 'Questions' ? 'How many questions?' : `Choose ${label.toLowerCase()}`}</h2><button type="button" aria-label="Close picker" onClick={() => { setOpen(false); trigger.current?.focus() }}><X size={22} /></button></header>
      <div className="study-picker-grid" role="listbox" id={`${id}-list`} aria-labelledby={`${id}-picker-title`} aria-activedescendant={`${id}-${active}`}>
        {options.map((option, index) => <button type="button" key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value} className="study-picker-option" data-active={index === active} onFocus={() => setActive(index)} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
          {option.artwork && <img src={option.artwork} alt="" width="72" height="72" />}{option.icon}<span>{option.label}</span>{option.value === value && <Check className="study-picker-check" size={20} aria-hidden="true" />}
        </button>)}
      </div>
    </dialog>}
    {open && !overlay && <div className="study-select-menu" data-up={!inline && !gallery && placement.up} style={inline || gallery ? undefined : { maxHeight: placement.height }} role="listbox" id={`${id}-list`} aria-labelledby={`${id}-label`}>
      {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value} className="study-select-option" data-active={index === active} data-tone={option.tone} onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
        {option.artwork && <img src={option.artwork} alt="" width="36" height="36" />}{option.icon}<span>{option.label}</span>{option.value === value && <Check size={18} aria-hidden="true" />}
      </div>)}
    </div>}
  </div>
}
