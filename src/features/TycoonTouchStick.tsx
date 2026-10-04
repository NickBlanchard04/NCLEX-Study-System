import { useEffect, useRef, type PointerEvent } from 'react'

/** Input stays outside React's render loop; the ward owns movement and speed. */
export function TycoonTouchStick({ disabled, onDirection }: { disabled: boolean; onDirection: (x: number, y: number) => void }) {
  const stick = useRef<HTMLButtonElement>(null)
  const pointer = useRef<number | null>(null)
  const direction = useRef(onDirection)
  useEffect(() => { direction.current = onDirection })
  useEffect(() => {
    const stop = () => {
      pointer.current = null
      stick.current?.style.setProperty('--stick-x', '0px')
      stick.current?.style.setProperty('--stick-y', '0px')
      direction.current(0, 0)
    }
    if (disabled) stop()
    const onVisibility = () => { if (document.hidden) stop() }
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      window.removeEventListener('blur', stop)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [disabled])
  function stop() {
    pointer.current = null
    stick.current?.style.setProperty('--stick-x', '0px')
    stick.current?.style.setProperty('--stick-y', '0px')
    direction.current(0, 0)
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || pointer.current !== event.pointerId) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - box.left - box.width / 2
    const y = event.clientY - box.top - box.height / 2
    const distance = Math.hypot(x, y)
    const radius = 30
    const scale = distance > radius ? radius / distance : 1
    event.currentTarget.style.setProperty('--stick-x', `${x * scale}px`)
    event.currentTarget.style.setProperty('--stick-y', `${y * scale}px`)
    direction.current(distance < 8 ? 0 : x / distance, distance < 8 ? 0 : y / distance)
  }
  return <div className="tycoon-touch-movement">
    <button ref={stick} type="button" className="tycoon-touch-stick" aria-label="Move nurse: drag in any direction" disabled={disabled}
      onPointerDown={(event) => {
        if (disabled || pointer.current !== null) return
        event.preventDefault()
        pointer.current = event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId)
        move(event)
      }}
      onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onBlur={stop}
      onKeyDown={(event) => {
        const keys: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
        const value = keys[event.key]
        if (value) { event.preventDefault(); direction.current(...value) }
      }} onKeyUp={stop}>
      <span className="tycoon-touch-stick-thumb" aria-hidden="true" />
    </button>
    <span className="tycoon-touch-hint">Drag to move · tap to walk</span>
  </div>
}
