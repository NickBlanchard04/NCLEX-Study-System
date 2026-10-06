import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StudyFilterIcon, studyFilterArtwork } from '../study-filter-icon'

describe('3D study filter illustrations', () => {
  it('uses a different image for every choice in each filter', () => {
    for (const choices of Object.values(studyFilterArtwork)) {
      expect(new Set(Object.values(choices)).size).toBe(Object.keys(choices).length)
    }
  })
  it('renders an optimized decorative image instead of the old flat SVG', () => {
    const html = renderToStaticMarkup(createElement(StudyFilterIcon, { kind: 'difficulty', value: 'advanced' }))
    expect(html).toContain('/images/question-bank/filters/difficulty-advanced.webp')
    expect(html).toContain('alt=""')
    expect(html).not.toContain('<svg')
  })
})
