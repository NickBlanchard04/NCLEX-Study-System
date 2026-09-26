import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type ReactElement,
} from 'react'
import { createPortal } from 'react-dom'
import './tycoon-tooltip.css'

const desktopMedia = '(min-width: 761px) and (hover: hover) and (pointer: fine)'
const mediaSubscribers = new Set<() => void>()
let mediaQuery: MediaQueryList | undefined
let mediaSnapshot = { enabled: false, version: 0 }
const serverSnapshot = mediaSnapshot
let activeTooltip: { id: string; dismiss: () => void } | undefined
let latestInteraction = 0

function activateTooltip(id: string, dismiss: () => void) {
  if (activeTooltip?.id !== id) activeTooltip?.dismiss()
  activeTooltip = { id, dismiss }
}

function releaseTooltip(id: string) {
  if (activeTooltip?.id === id) activeTooltip = undefined
}

function beginInteraction() {
  return ++latestInteraction
}

function getMediaSnapshot() {
  if (!mediaQuery && typeof window !== 'undefined') {
    mediaQuery = window.matchMedia(desktopMedia)
  }
  if (mediaQuery && mediaQuery.matches !== mediaSnapshot.enabled) {
    mediaSnapshot = {
      enabled: mediaQuery.matches,
      version: mediaSnapshot.version + 1,
    }
  }
  return mediaSnapshot
}

function notifyMediaChange() {
  getMediaSnapshot()
  mediaSubscribers.forEach((notify) => notify())
}

function subscribeToMedia(notify: () => void) {
  getMediaSnapshot()
  if (mediaSubscribers.size === 0) {
    mediaQuery?.addEventListener('change', notifyMediaChange)
  }
  mediaSubscribers.add(notify)
  return () => {
    mediaSubscribers.delete(notify)
    if (mediaSubscribers.size === 0) {
      mediaQuery?.removeEventListener('change', notifyMediaChange)
    }
  }
}

type TriggerProps = HTMLAttributes<HTMLElement> & {
  disabled?: boolean
  href?: string
  controls?: boolean
}

type OpenTooltip = {
  anchor: HTMLElement
  container: HTMLElement
  mediaVersion: number
}

export function TycoonTooltip({
  text,
  children,
  focusable = true,
}: {
  text?: string
  children: ReactElement<TriggerProps>
  focusable?: boolean
}) {
  const media = useSyncExternalStore(
    subscribeToMedia,
    getMediaSnapshot,
    () => serverSnapshot,
  )
  const enabled = media.enabled && Boolean(text)
  const id = useId()
  const [open, setOpen] = useState<OpenTooltip | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerHovered = useRef(false)
  const tooltipHovered = useRef(false)
  const triggerFocused = useRef(false)
  const visible = enabled && open?.mediaVersion === media.version

  const clearTimers = useCallback(() => {
    if (showTimer.current !== null) clearTimeout(showTimer.current)
    if (hideTimer.current !== null) clearTimeout(hideTimer.current)
    showTimer.current = null
    hideTimer.current = null
  }, [])

  const dismiss = useCallback(() => {
    clearTimers()
    tooltipHovered.current = false
    releaseTooltip(id)
    setOpen(null)
  }, [clearTimers, id])

  function show(anchor: HTMLElement) {
    clearTimers()
    const currentMedia = getMediaSnapshot()
    if (!text || !currentMedia.enabled || !anchor.isConnected) return
    activateTooltip(id, dismiss)
    setOpen({
      anchor,
      container: anchor.closest('dialog') ?? document.body,
      mediaVersion: currentMedia.version,
    })
  }

  function leave() {
    if (showTimer.current !== null) clearTimeout(showTimer.current)
    showTimer.current = null
    if (hideTimer.current !== null) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (
        !triggerHovered.current &&
        !tooltipHovered.current &&
        !triggerFocused.current
      ) {
        dismiss()
      }
    }, 160)
  }

  useEffect(() => {
    // A media generation also prevents a previous tooltip returning after resize.
    clearTimers()
    triggerHovered.current = false
    tooltipHovered.current = false
    triggerFocused.current = false
    if (!enabled) releaseTooltip(id)
    return clearTimers
  }, [media.version, text, enabled, clearTimers, id])

  useEffect(
    () => () => {
      clearTimers()
      releaseTooltip(id)
    },
    [clearTimers, id],
  )

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (!visible || event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      dismiss()
    }
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('scroll', dismiss, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', dismiss)
    window.addEventListener('blur', dismiss)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('blur', dismiss)
    }
  }, [enabled, visible, dismiss])

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current
    if (!visible || !open || !tooltip) return
    const anchor = open.anchor.getBoundingClientRect()
    const bounds = tooltip.getBoundingClientRect()
    const viewport = window.visualViewport
    const viewportLeft = viewport?.offsetLeft ?? 0
    const viewportTop = viewport?.offsetTop ?? 0
    const viewportWidth = viewport?.width ?? window.innerWidth
    const viewportHeight = viewport?.height ?? window.innerHeight
    const margin = 12
    const gap = 10
    const minLeft = viewportLeft + margin
    const maxLeft = viewportLeft + viewportWidth - bounds.width - margin
    const minTop = viewportTop + margin
    const maxTop = viewportTop + viewportHeight - bounds.height - margin
    const left = Math.max(
      minLeft,
      Math.min(anchor.left + (anchor.width - bounds.width) / 2, maxLeft),
    )
    const below = anchor.bottom + gap
    const top = Math.max(
      minTop,
      Math.min(
        below <= maxTop ? below : anchor.top - bounds.height - gap,
        maxTop,
      ),
    )
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
    tooltip.style.visibility = 'visible'
  }, [visible, open, text])

  if (!enabled) return children

  const original = children.props
  const tag = typeof children.type === 'string' ? children.type : ''
  const naturallyFocusable =
    ['button', 'input', 'select', 'textarea', 'summary', 'iframe'].includes(
      tag,
    ) ||
    (['a', 'area'].includes(tag) && Boolean(original.href)) ||
    (['audio', 'video'].includes(tag) && original.controls) ||
    original.contentEditable === true ||
    original.contentEditable === 'true'
  const handlePointerEnter: TriggerProps['onPointerEnter'] = (event) => {
    original.onPointerEnter?.(event)
    if (event.defaultPrevented || event.pointerType === 'touch') return
    triggerHovered.current = true
    clearTimers()
    const anchor = event.currentTarget
    const interaction = beginInteraction()
    showTimer.current = setTimeout(() => {
      if (interaction === latestInteraction) show(anchor)
    }, 300)
  }
  const handlePointerLeave: TriggerProps['onPointerLeave'] = (event) => {
    original.onPointerLeave?.(event)
    triggerHovered.current = false
    leave()
  }
  const handleFocus: TriggerProps['onFocus'] = (event) => {
    original.onFocus?.(event)
    if (event.defaultPrevented) return
    triggerFocused.current = true
    beginInteraction()
    show(event.currentTarget)
  }
  const handleBlur: TriggerProps['onBlur'] = (event) => {
    original.onBlur?.(event)
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    triggerFocused.current = false
    leave()
  }
  // cloneElement stores these event callbacks without invoking their ref reads.
  // eslint-disable-next-line react-hooks/refs
  const trigger = cloneElement(children, {
    tabIndex:
      original.tabIndex ??
      (focusable && !naturallyFocusable && !original.disabled ? 0 : undefined),
    'aria-describedby': visible
      ? [original['aria-describedby'], id].filter(Boolean).join(' ')
      : original['aria-describedby'],
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
  })

  return (
    <>
      {trigger}
      {visible && open
        ? createPortal(
            <div
              id={id}
              ref={tooltipRef}
              role="tooltip"
              className="tycoon-tooltip"
              onPointerEnter={() => {
                tooltipHovered.current = true
                clearTimers()
              }}
              onPointerLeave={() => {
                tooltipHovered.current = false
                leave()
              }}
            >
              {text}
            </div>,
            open.container,
          )
        : null}
    </>
  )
}
