import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { GameLandingPage } from '../game-landing-page'
import pages from '../../seo/pages.json'

describe('game landing page', () => {
  it('provides a crawlable introduction and direct play link', () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/nursing-game/']}><GameLandingPage /></MemoryRouter>)
    expect(html).toContain('href="/nurse-tycoon/"')
    expect(html).toContain('What happens during a shift?')
    expect(html).toContain('not clinically validated training')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('/nurse-tycoon-gameplay.png')
  })
  it('indexes the introduction without indexing the game session', () => {
    expect(pages.find(page => page.path === '/nursing-game')?.index).toBe(true)
    expect(pages.find(page => page.path === '/nurse-tycoon')?.index).toBe(false)
  })
})
