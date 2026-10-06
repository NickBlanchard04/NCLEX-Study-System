import { describe, expect, it } from 'vitest'
import { followCamera, followZoom } from '../tycoon-ward-camera'

describe('readable follow camera', () => {
  it('keeps landscape touch zoom readable at wide and short phone sizes', () => {
    for (const [width, height] of [[1280, 516], [844, 390], [667, 300]]) {
      expect(followZoom(width, height, true)).toBeGreaterThanOrEqual(.78)
      const point = { x: 900, y: 800 }, zoom = followZoom(width, height, true)
      const camera = followCamera(width, height, zoom, point, null, 0, true, true)
      const screenY = (point.y - camera.y) * zoom + height / 2
      expect((point.x - camera.x) * zoom + width / 2).toBeCloseTo(width / 2)
      expect(screenY - 47 * zoom).toBeCloseTo(height / 2)
    }
  })
  it('preserves desktop camera framing and stops easing for reduced motion', () => {
    const point = { x: 900, y: 800 }
    const zoom = followZoom(1440, 900)
    const camera = followCamera(1440, 900, zoom, point, { x: 0, y: 0 }, 16, true)
    expect((point.x - camera.x) * zoom + 720).toBeCloseTo(1440 * .44)
    expect((point.y - camera.y) * zoom + 450).toBeCloseTo(900 * .54)
  })
})
