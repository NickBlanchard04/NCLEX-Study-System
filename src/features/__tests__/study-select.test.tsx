import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StudySelect } from '../study-select'

describe('Study setup dropdown', () => {
  it('labels the selected value and keeps decorative artwork out of its accessible name', () => {
    const html = renderToStaticMarkup(createElement(StudySelect, { label: 'Category', value: 'safety', options: [{ value: 'safety', label: 'Safety and Infection Control', artwork: '/images/exam-prep/safety.webp', tone: 'cyan' }], onChange: () => undefined }))
    expect(html).toContain('role="combobox"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-haspopup="listbox"')
    expect(html).toContain('Safety and Infection Control')
    expect(html).toContain('alt=""')
    expect(html).not.toContain('role="listbox"')
  })
})
