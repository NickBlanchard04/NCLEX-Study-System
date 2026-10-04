import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { VerificationEmailScreen } from '../AuthGate'

describe('Verification email screen', () => {
  it('shows the submitted address and a clear next step instead of the signup form', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null,
      createElement(VerificationEmailScreen, { email: 'student@example.com', onBack: () => {}, onSignIn: () => {} })))
    expect(html).toContain('Check your email')
    expect(html).toContain('student@example.com')
    expect(html).toContain('verification link')
    expect(html).toContain('Back to sign in')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('type="password"')
  })
})
