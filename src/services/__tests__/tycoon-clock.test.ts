import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTycoonClockTime, startTycoonClock, TYCOON_REAL_MS_PER_GAME_MINUTE } from '../tycoon-clock'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function clockEnvironment(initialVisibility: DocumentVisibilityState = 'visible') {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  let now = 0
  let visibility = initialVisibility
  const events = new EventTarget()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('window', {
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  })
  vi.stubGlobal('document', {
    get visibilityState() {
      return visibility
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  })

  return {
    pass(ms: number, timerMs = ms) {
      now += ms
      vi.advanceTimersByTime(timerMs)
    },
    setVisibility(next: DocumentVisibilityState) {
      visibility = next
      events.dispatchEvent(new Event('visibilitychange'))
    },
  }
}

describe('tycoon clock time', () => {
  it('starts at 7 AM and includes fractional minutes in the displayed time and hands', () => {
    expect(TYCOON_REAL_MS_PER_GAME_MINUTE).toBe(40_000)
    expect(getTycoonClockTime(0)).toMatchObject({
      hours: 7,
      minutes: 0,
      seconds: 0,
      label: '7:00:00 AM',
      shortLabel: '7:00 AM',
      dateTime: '07:00:00',
      hourDegrees: 210,
      minuteDegrees: 0,
      secondDegrees: 0,
    })
    expect(getTycoonClockTime(2.5)).toMatchObject({
      label: '7:02:30 AM',
      dateTime: '07:02:30',
      hourDegrees: 211.25,
      minuteDegrees: 15,
      secondDegrees: 900,
    })
  })

  it('formats noon, midnight, and the next day while preserving forward rotations', () => {
    expect(getTycoonClockTime(300)).toMatchObject({
      hours: 12,
      meridiem: 'PM',
      label: '12:00:00 PM',
      dateTime: '12:00:00',
    })
    expect(getTycoonClockTime(1020)).toMatchObject({
      hours: 0,
      meridiem: 'AM',
      label: '12:00:00 AM',
      dateTime: '00:00:00',
    })
    const nextDay = getTycoonClockTime(1440)
    expect(nextDay.label).toBe('7:00:00 AM')
    expect(nextDay.hourDegrees).toBe(930)
    expect(nextDay.minuteDegrees).toBe(8640)
    expect(nextDay.secondDegrees).toBe(518400)
    expect(getTycoonClockTime(1).secondDegrees).toBeGreaterThan(
      getTycoonClockTime(59 / 60).secondDegrees,
    )
  })
})

describe('tycoon clock elapsed time', () => {
  it('uses actual elapsed time when a timer callback is delayed', () => {
    const env = clockEnvironment()
    const elapsed = vi.fn()
    const stop = startTycoonClock(elapsed)
    env.pass(100)
    env.pass(735, 100)
    env.pass(112, 100)

    expect(elapsed.mock.calls.map(([ms]) => ms)).toEqual([100, 735, 112])
    expect(elapsed.mock.calls.reduce((sum, [ms]) => sum + ms, 0)).toBe(947)
    stop()
  })

  it('flushes visible time on hide and resumes without counting time spent hidden', () => {
    const env = clockEnvironment()
    const elapsed = vi.fn()
    const stop = startTycoonClock(elapsed)
    env.pass(100)
    env.pass(37, 0)
    env.setVisibility('hidden')
    env.pass(60000)
    expect(elapsed.mock.calls.map(([ms]) => ms)).toEqual([100, 37])
    expect(vi.getTimerCount()).toBe(0)

    env.setVisibility('visible')
    env.pass(100)
    expect(elapsed.mock.calls.map(([ms]) => ms)).toEqual([100, 37, 100])
    stop()
  })

  it('waits for visibility when started in a hidden tab', () => {
    const env = clockEnvironment('hidden')
    const elapsed = vi.fn()
    const stop = startTycoonClock(elapsed)
    env.pass(60000)
    expect(elapsed).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    env.setVisibility('visible')
    env.pass(100)
    expect(elapsed).toHaveBeenCalledExactlyOnceWith(100)
    stop()
  })

  it('flushes the final partial tick once and removes timers and visibility listeners', () => {
    const env = clockEnvironment()
    const elapsed = vi.fn()
    const stop = startTycoonClock(elapsed)
    env.pass(65, 0)
    stop()
    stop()
    env.setVisibility('hidden')
    env.pass(2000)
    env.setVisibility('visible')
    env.pass(100)

    expect(elapsed).toHaveBeenCalledExactlyOnceWith(65)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not flush hidden time when cleaned up while paused', () => {
    const env = clockEnvironment()
    const elapsed = vi.fn()
    const stop = startTycoonClock(elapsed)
    env.pass(75, 0)
    env.setVisibility('hidden')
    env.pass(60000)
    stop()
    expect(elapsed).toHaveBeenCalledExactlyOnceWith(75)
  })
})
