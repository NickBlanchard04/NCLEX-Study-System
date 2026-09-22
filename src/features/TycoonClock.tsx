import { useEffect, useRef, useState } from 'react'
import { useStudySystemStore } from '../app/store'
import type { TycoonShift } from '../app/types'
import {
  getTycoonClockTime,
  startTycoonClock,
  TYCOON_REAL_MS_PER_GAME_MINUTE,
} from '../services/tycoon-clock'
import { TycoonTooltip } from './TycoonTooltip'

const hourMarkers = Array.from({ length: 12 }, (_, index) => index * 30)

export function TycoonClock({
  shift,
  completedShifts,
  inGame,
  paused,
}: {
  shift: TycoonShift | null
  completedShifts: number
  inGame: boolean
  paused: boolean
}) {
  const advanceTime = useStudySystemStore((state) => state.advanceTycoonTime)
  const pendingMs = useRef(0)
  const [displayPendingMs, setDisplayPendingMs] = useState(0)
  const running = inGame && shift?.status === 'running' && !paused
  const shiftId = shift?.id

  useEffect(() => {
    if (!running || !shiftId) return

    // Only the clock redraws between saved game minutes. Timer delays are measured
    // from monotonic elapsed time, so a late callback never slows the simulation.
    const stop = startTycoonClock((elapsedMs) => {
      const current = useStudySystemStore.getState().tycoon.activeShift
      if (current?.id !== shiftId || current.status !== 'running') return

      pendingMs.current += elapsedMs
      const minutes = Math.floor(
        pendingMs.current / TYCOON_REAL_MS_PER_GAME_MINUTE,
      )
      if (minutes > 0) {
        pendingMs.current -= minutes * TYCOON_REAL_MS_PER_GAME_MINUTE
        advanceTime(minutes, { recordEvent: false })
      }
      setDisplayPendingMs(pendingMs.current)
    })

    return () => {
      stop()
      const current = useStudySystemStore.getState().tycoon.activeShift
      if (
        current?.id === shiftId &&
        current.status === 'running' &&
        pendingMs.current > 0
      ) {
        const remainingMinutes =
          pendingMs.current / TYCOON_REAL_MS_PER_GAME_MINUTE
        pendingMs.current = 0
        advanceTime(remainingMinutes, { recordEvent: false })
        setDisplayPendingMs(0)
      }
    }
  }, [advanceTime, running, shiftId])

  const clock = getTycoonClockTime(
    (shift?.shiftMinute ?? 0) + displayPendingMs / TYCOON_REAL_MS_PER_GAME_MINUTE,
  )

  return (
    <TycoonTooltip text="Current shift time. The clock pauses during dialogs and when this tab is hidden. Care actions also use shift time.">
      <div className="tycoon-hud-time">
        <time
          className="tycoon-analog-clock"
          dateTime={clock.dateTime}
          aria-hidden="true"
        >
          <svg className="tycoon-clock-face" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50" cy="50" r="47"
              fill="#00233e" stroke="currentColor" strokeWidth="2"
            />
            {hourMarkers.map((angle) => (
              <line
                key={angle}
                x1="50" y1="7" x2="50" y2={angle % 90 === 0 ? '12' : '10'}
                stroke="currentColor" strokeWidth="1.5"
                transform={`rotate(${angle} 50 50)`}
              />
            ))}
            <g className="tycoon-clock-numerals" textAnchor="middle" dominantBaseline="central">
              <text x="50" y="24">12</text>
              <text x="77" y="50">3</text>
              <text x="50" y="77">6</text>
              <text x="23" y="50">9</text>
            </g>
            <line
              x1="50" y1="50" x2="50" y2="30"
              stroke="#f6f8ff" strokeWidth="5" strokeLinecap="round"
              transform={`rotate(${clock.hourDegrees} 50 50)`}
            />
            <line
              x1="50" y1="50" x2="50" y2="17"
              stroke="#f6f8ff" strokeWidth="3" strokeLinecap="round"
              transform={`rotate(${clock.minuteDegrees} 50 50)`}
            />
            <line
              className="tycoon-clock-second"
              x1="50" y1="59" x2="50" y2="12"
              stroke="currentColor" strokeWidth="1.5"
              transform={`rotate(${clock.secondDegrees} 50 50)`}
            />
            <circle cx="50" cy="50" r="3" fill="currentColor" />
          </svg>
        </time>
        <div className="tycoon-clock-meta">
          <strong className="tycoon-clock-digital">
            <time dateTime={clock.dateTime} aria-label={`Shift time: ${clock.label}`}>
              {clock.label.split(' ')[0]}
            </time>
          </strong>
          <span className="tycoon-clock-meridiem">{clock.meridiem}</span>
          {inGame && (shift?.status === 'finished' || paused) ? (
            <span className="tycoon-clock-caption">
              {shift?.status === 'finished' ? 'Finished' : 'Paused'}
            </span>
          ) : !inGame ? (
            <span>
              Shift {completedShifts + 1} / {Math.max(3, completedShifts + 1)}
            </span>
          ) : null}
        </div>
      </div>
    </TycoonTooltip>
  )
}
