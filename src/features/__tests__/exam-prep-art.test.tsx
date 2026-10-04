import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ExamPrepPage } from '../pages'

describe('Exam Prep topic selection', () => {
  it('presents six named native radio choices with individual artwork', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ExamPrepPage)))
    expect(html.match(/type="radio"/g)).toHaveLength(6)
    expect(html.match(/class="exam-prep-art"/g)).toHaveLength(6)
    expect(html.match(/data-selected="true"/g)).toHaveLength(1)
    expect(html).toContain('/images/exam-prep/physiology.webp')
    expect(html).toContain('What would you like to review?')
    expect(html).toContain('Start review')
    expect(html).toContain('Change exam')
    expect(html).toContain('Practice with 300+ NCLEX-RN questions.')
    expect(html).toContain('/exam-prep?auth=signup')
    expect(html).toContain('/exam-prep?auth=signin')
    expect(html).not.toContain('Untimed')
    expect(html).not.toContain('Feedback after every answer')
  })
})
