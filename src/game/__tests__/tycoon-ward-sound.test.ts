import { afterEach, describe, expect, it, vi } from 'vitest'
import { WardSound } from '../tycoon-ward-sound'

afterEach(() => vi.unstubAllGlobals())
describe('optional ward audio', () => {
  it('requires a gesture, honors pause/mute, and closes its audio context', () => {
    const start = vi.fn(), close = vi.fn(() => Promise.resolve()), volume = vi.fn(), constructed = vi.fn()
    vi.stubGlobal('AudioContext', class {
      state = 'running'; currentTime = 0; destination = {}
      constructor() { constructed() }
      createGain() { return { gain: { value: 0, setValueAtTime: volume, linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() } }
      createOscillator() { return { type: '', frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start, stop: vi.fn() } }
      close = close
    })
    const audio = new WardSound()
    audio.cue('bell'); expect(constructed).not.toHaveBeenCalled()
    audio.unlock(); audio.cue('step'); expect(start).toHaveBeenCalledTimes(1)
    audio.configure(false, false); audio.cue('complete'); expect(start).toHaveBeenCalledTimes(1)
    audio.configure(true, true); audio.cue('scan'); expect(start).toHaveBeenCalledTimes(1)
    audio.configure(true, false); audio.cue('scan'); expect(start).toHaveBeenCalledTimes(2)
    const count = volume.mock.calls.length
    for (let frame = 0; frame < 120; frame++) audio.configure(true, false)
    expect(volume).toHaveBeenCalledTimes(count)
    audio.destroy(); expect(close).toHaveBeenCalledTimes(1)
  })
  it('does not break gameplay when audio is unavailable or disabled', () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('Audio unavailable') } })
    const audio = new WardSound()
    expect(() => { audio.unlock(); audio.cue('scan'); audio.configure(false, false); audio.unlock(); audio.destroy() }).not.toThrow()
  })
})
