import { useEffect, useState, type CSSProperties } from 'react'
import type { TycoonTask } from '../app/types'
import './tycoon-map-nurses.css'

const nurseUniforms = [
  { scrub: '#54dccb', skin: '#d7a17d', hair: '#4c302b' },
  { scrub: '#68baff', skin: '#ad7251', hair: '#252b35' },
  { scrub: '#b5a3f5', skin: '#efc7a7', hair: '#76523a' },
  { scrub: '#79d7e8', skin: '#81513c', hair: '#292523' },
  { scrub: '#77b2ef', skin: '#e0ae87', hair: '#392a2d' },
  { scrub: '#a1d9ba', skin: '#bd8763', hair: '#332c26' },
] as const

type NurseStyle = CSSProperties & {
  '--nurse-scrub': string
  '--nurse-skin': string
  '--nurse-hair': string
}

function NurseCharacter({ roomIndex }: { roomIndex: number }) {
  const uniform = nurseUniforms[roomIndex]
  const style: NurseStyle = {
    '--nurse-scrub': uniform.scrub,
    '--nurse-skin': uniform.skin,
    '--nurse-hair': uniform.hair,
  }

  return (
    <div
      className={`tycoon-map-nurse-route tycoon-map-nurse-route-${roomIndex + 1}`}
      data-nurse-room={101 + roomIndex}
      style={style}
    >
      <div className="tycoon-map-nurse-position">
        <div className="tycoon-map-nurse-pop">
          <div className="tycoon-map-nurse-stride">
            <svg className="tycoon-map-nurse-figure" viewBox="0 0 32 40" fill="none">
              <ellipse cx="16" cy="37" rx="9" ry="2" fill="#001625" opacity=".45" />
              <g className="tycoon-map-nurse-limb tycoon-map-nurse-leg-left">
                <path d="M12 25v10" stroke="var(--nurse-scrub)" strokeWidth="5" strokeLinecap="round" />
                <path d="M12 35h-3" stroke="#e2f3f7" strokeWidth="3" strokeLinecap="round" />
              </g>
              <g className="tycoon-map-nurse-limb tycoon-map-nurse-leg-right">
                <path d="M20 25v10" stroke="var(--nurse-scrub)" strokeWidth="5" strokeLinecap="round" />
                <path d="M20 35h3" stroke="#e2f3f7" strokeWidth="3" strokeLinecap="round" />
              </g>
              <g className="tycoon-map-nurse-limb tycoon-map-nurse-arm-left">
                <path d="m9 17-3 8" stroke="var(--nurse-skin)" strokeWidth="3.5" strokeLinecap="round" />
                <path d="m10 16-2 5" stroke="var(--nurse-scrub)" strokeWidth="5" strokeLinecap="round" />
              </g>
              <g className="tycoon-map-nurse-limb tycoon-map-nurse-arm-right">
                <path d="m23 17 3 8" stroke="var(--nurse-skin)" strokeWidth="3.5" strokeLinecap="round" />
                <path d="m22 16 2 5" stroke="var(--nurse-scrub)" strokeWidth="5" strokeLinecap="round" />
              </g>
              <path d="M10 15h12l2 13H8z" fill="var(--nurse-scrub)" stroke="#092b41" strokeWidth="1" />
              <path d="m13 15 3 4 3-4" fill="var(--nurse-skin)" stroke="#176579" strokeWidth=".8" />
              <path d="M12 16v5a3 3 0 0 0 6 0v-4" stroke="#14495b" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="18" cy="22" r="1.5" fill="#e9fcff" />
              <rect x="19.5" y="17" width="3.5" height="5" rx=".6" fill="#f3fcff" />
              <path d="M20.5 18.5h1.5m-1.5 1.5h1.5" stroke="#2284a1" strokeWidth=".6" />
              {roomIndex % 2 === 0 ? <circle cx="20" cy="4" r="3" fill="var(--nurse-hair)" /> : null}
              <path d="M9 10V8a7 7 0 0 1 14 0v3z" fill="var(--nurse-hair)" />
              <ellipse cx="16" cy="9.5" rx="5.5" ry="6" fill="var(--nurse-skin)" />
              <path d="M10 8c0-4 3-6 6-6s6 2 6 6c-3 0-5-1-6-3-1 2-3 3-6 3Z" fill="var(--nurse-hair)" />
              <circle cx="14" cy="10" r=".65" fill="#302d32" />
              <circle cx="18" cy="10" r=".65" fill="#302d32" />
              <path d="M14.5 12.5q1.5 1 3 0" stroke="#744b42" strokeWidth=".7" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TycoonMapNurses({ tasks, paused }: { tasks: TycoonTask[]; paused: boolean }) {
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  )

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  const completedRooms = new Set(
    tasks.filter((task) => task.status === 'completed').map((task) => task.room),
  )

  return (
    <div className="tycoon-map-nurses" data-paused={paused || !pageVisible} aria-hidden="true">
      {nurseUniforms.map((_, roomIndex) =>
        completedRooms.has(`Room ${101 + roomIndex}`) ? (
          <NurseCharacter key={roomIndex} roomIndex={roomIndex} />
        ) : null,
      )}
    </div>
  )
}
