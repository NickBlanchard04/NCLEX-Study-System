import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { TopicLandingPage } from '../features/topic-landing-page'

export function renderTopic(slug: string) {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[`/nclex-rn/${slug}/`]}><TopicLandingPage slug={slug} /></MemoryRouter>)
}
