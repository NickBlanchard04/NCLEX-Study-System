export const TYCOON_REAL_MS_PER_GAME_MINUTE = 40_000

export function getTycoonClockTime(shiftMinute: number) {
  const elapsedSeconds = (Number.isFinite(shiftMinute) ? shiftMinute : 0) * 60
  const totalSeconds = 7 * 60 * 60 + elapsedSeconds
  const secondsToday = ((Math.floor(totalSeconds) % 86400) + 86400) % 86400
  const hours = Math.floor(secondsToday / 3600)
  const minutes = Math.floor((secondsToday % 3600) / 60)
  const seconds = secondsToday % 60
  const meridiem: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM'
  const pad = (value: number) => String(value).padStart(2, '0')
  const shortLabel = `${hours % 12 || 12}:${pad(minutes)} ${meridiem}`

  return {
    hours,
    minutes,
    seconds,
    meridiem,
    label: `${hours % 12 || 12}:${pad(minutes)}:${pad(seconds)} ${meridiem}`,
    shortLabel,
    dateTime: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    // Keep rotations continuous through each minute, hour, and day rollover.
    hourDegrees: 210 + elapsedSeconds / 120,
    minuteDegrees: elapsedSeconds / 10,
    secondDegrees: elapsedSeconds * 6,
  }
}

export function startTycoonClock(onElapsed: (elapsedMs: number) => void): () => void {
  let timer: number | undefined
  let previousTime: number | null = null
  let disposed = false

  const flushElapsed = () => {
    if (previousTime === null) return
    const now = performance.now()
    const elapsed = now - previousTime
    previousTime = now
    if (elapsed > 0) onElapsed(elapsed)
  }

  const stop = () => {
    if (timer !== undefined) window.clearInterval(timer)
    timer = undefined
    flushElapsed()
    previousTime = null
  }

  const start = () => {
    if (disposed || previousTime !== null || document.visibilityState === 'hidden') return
    previousTime = performance.now()
    timer = window.setInterval(flushElapsed, 100)
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') stop()
    else start()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  start()

  return () => {
    if (disposed) return
    disposed = true
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stop()
  }
}
