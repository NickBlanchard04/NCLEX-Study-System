import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TopicLandingPage } from '../topic-landing-page'
import { ExamPrepPage } from '../pages'
import { StudyResultSave } from '../study-result-save'
import topics from '../../seo/topics.json'
import pages from '../../seo/pages.json'
import { nclexCategoryExpansion } from '../../data/nclex-category-expansion'

describe('Public topic acquisition flow', () => {
  for (const topic of topics) {
    it(`renders a sourced sample and matching review link for ${topic.slug}`, () => {
      const path = `/nclex-rn/${topic.slug}`
      const html = renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><TopicLandingPage slug={topic.slug} /></MemoryRouter>)
      const sample = nclexCategoryExpansion.find(question => question.id === topic.sampleId)!
      expect(sample.category).toBe(topic.category)
      expect(sample.learnerVisible).toBe(true)
      expect(html).toContain(sample.prompt)
      expect(html).toContain(sample.sourceRefs![0])
      expect(html).toContain(`/exam-prep?topic=${topic.slug}&amp;preview=5`)
      expect(html).toContain('Not yet independently clinically reviewed')
      expect(pages.find(page => page.path === path)?.title).toBe(topic.title)
      const setup = renderToStaticMarkup(<MemoryRouter initialEntries={[`/exam-prep?topic=${topic.slug}&preview=5`]}><ExamPrepPage /></MemoryRouter>)
      expect(setup).toContain('Review up to 5 questions')
      expect(setup).toMatch(new RegExp(`value="${topic.category}"[^>]*checked|checked=""[^>]*value="${topic.category}"`))
    })
  }
  it('keeps unknown topic parameters out of the preview configuration', () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/exam-prep?topic=unknown&preview=5']}><ExamPrepPage /></MemoryRouter>)
    expect(html).toContain('Review up to 10 questions')
  })
  it('offers result signup without removing guest continuation', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(StudyResultSave, { result: { id: 'test', title: 'Practice', route: '/exam-prep', completedAt: '2026-10-04', total: 1, answers: [{ id: 'sample', correct: true }] } })))
    expect(html).toContain('Keep the progress you just made.')
    expect(html).toContain('Create an account')
    expect(html).toContain('Save your results and pick up where you left off.')
    expect(html).toContain('Continue as guest')
  })
})
