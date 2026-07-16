import { expect, test, type Page } from '@playwright/test'

function expectNoHorizontalOverflow(page: Page) {
  return expect
    .poll(async () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1)
}

test.describe('unauthenticated account entry', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('sign-in, signup, and recovery stay honest and usable on mobile', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'account entry runs once')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/?auth=signin')

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible()
    await expect(page.getByText(/Study\. Practice\. Lead\./i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Google|Apple/i })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send password reset email' })).toBeVisible()
    await page.getByRole('button', { name: 'Back to sign in' }).click()

    await page.getByRole('button', { name: 'Create an account' }).click()
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel(/I agree to the beta terms/i)).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('authenticated account settings', () => {
  test('shows real access status and requires reset confirmation', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'account settings runs once')
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: 'Profile and settings' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Open beta access' })).toBeVisible()
    await expect(page.getByRole('link', { name: /View access details/i })).toHaveAttribute('href', '/pricing')

    await page.getByRole('button', { name: 'Reset local progress' }).click()
    const confirmation = page.getByRole('alertdialog', { name: 'Reset local study progress?' })
    await expect(confirmation).toBeVisible()
    await expect(confirmation.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await expect(confirmation.getByRole('button', { name: 'Confirm reset' })).toBeVisible()
    await confirmation.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirmation).toBeHidden()
  })
})
