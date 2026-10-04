import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const smallScreen = '(max-width: 599px), (max-width: 1100px) and (max-height: 600px), (pointer: coarse) and (max-height: 600px)'

/** Paginate the existing controls, never clone them or reset their care/form state. */
export function TycoonDialogPages({ children }: { children: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLElement[][]>([])
  const currentRef = useRef(0)
  const [navigation, setNavigation] = useState({ page: 0, count: 1 })

  function showPage(page: number) {
    const body = bodyRef.current
    if (!body) return
    const pages = pagesRef.current
    const index = Math.max(0, Math.min(page, pages.length - 1))
    const visible = new Set<HTMLElement>()
    for (const item of pages[index] ?? []) {
      let ancestor: HTMLElement | null = item
      while (ancestor && ancestor !== body) { visible.add(ancestor); ancestor = ancestor.parentElement }
      item.querySelectorAll<HTMLElement>('*').forEach(element => visible.add(element))
    }
    body.querySelectorAll<HTMLElement>('[data-dialog-part]').forEach(element => {
      element.dataset.dialogHidden = String(!visible.has(element))
    })
    currentRef.current = index
    setNavigation(previous => previous.page === index && previous.count === pages.length ? previous : { page: index, count: pages.length })
  }

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const media = window.matchMedia(smallScreen)
    let frame = 0, active = true
    const measure = () => {
      if (!active) return
      const focused = document.activeElement
      body.closest('dialog')?.style.setProperty('--tycoon-popup-height', `${Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight)}px`)
      body.querySelectorAll<HTMLElement>('[data-dialog-part]').forEach(element => {
        delete element.dataset.dialogPart; delete element.dataset.dialogHidden
      })
      if (!media.matches) { pagesRef.current = []; body.dataset.dialogReady = 'true'; setNavigation({ page: 0, count: 1 }); return }
      const budget = body.clientHeight
      if (!budget) return
      const units: HTMLElement[] = []
      const parts: HTMLElement[] = []
      const visit = (element: HTMLElement, reserved = 0) => {
        if (!element.getClientRects().length || getComputedStyle(element).display === 'none') return
        parts.push(element)
        const style = getComputedStyle(element)
        const outerHeight = element.getBoundingClientRect().height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
        // A fitting section stays together (choices, vitals, checklists). Only split
        // large sections at existing semantic boundaries when the viewport needs it.
        const atomic = element.matches('button, label, p, h3, textarea, summary, progress, .tycoon-observations dl, .tycoon-dialog-patient')
        if (atomic || outerHeight <= budget - reserved || !element.children.length) units.push(element)
        else {
          const spacing = ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'] as const
          const overhead = spacing.reduce((sum, property) => sum + (parseFloat(style[property]) || 0), 0)
          Array.from(element.children).forEach(child => { if (child instanceof HTMLElement) visit(child, reserved + overhead) })
        }
      }
      Array.from(body.children).forEach(child => { if (child instanceof HTMLElement) visit(child) })
      parts.forEach(element => { element.dataset.dialogPart = ''; element.dataset.dialogHidden = 'true' })
      const reveal = (unit: HTMLElement) => {
        let element: HTMLElement | null = unit
        while (element && element !== body) { element.dataset.dialogHidden = 'false'; element = element.parentElement }
      }
      const pages: HTMLElement[][] = [[]]
      for (const unit of units) {
        reveal(unit)
        const page = pages[pages.length - 1]
        if (page.length && body.scrollHeight > budget + 1) {
          parts.forEach(element => { element.dataset.dialogHidden = 'true' })
          pages.push([unit]); reveal(unit)
        } else page.push(unit)
      }
      pagesRef.current = pages
      const focusedPage = pages.findIndex(page => page.some(unit => unit.contains(focused)))
      showPage(focusedPage >= 0 ? focusedPage : currentRef.current)
      body.dataset.dialogReady = 'true'
    }
    const schedule = () => { if (!active) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    measure()
    const observer = new ResizeObserver(schedule)
    observer.observe(body)
    // Observe content changes, not our own visibility annotations.
    const content = new MutationObserver(schedule)
    content.observe(body, { childList: true, subtree: true, characterData: true })
    body.addEventListener('toggle', schedule, true)
    media.addEventListener('change', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    void document.fonts.ready.then(schedule)
    return () => {
      active = false
      cancelAnimationFrame(frame); observer.disconnect(); content.disconnect()
      body.removeEventListener('toggle', schedule, true)
      media.removeEventListener('change', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [children])

  return <>
    <div ref={bodyRef} className="tycoon-dialog-page-body">{children}</div>
    <nav className="tycoon-dialog-page-nav" aria-label="Popup pages">
      <button type="button" disabled={navigation.page === 0} onClick={() => showPage(navigation.page - 1)}>Back</button>
      <span role="status">{navigation.page + 1} / {navigation.count}</span>
      <button type="button" disabled={navigation.page >= navigation.count - 1} onClick={() => showPage(navigation.page + 1)}>Next</button>
    </nav>
  </>
}
