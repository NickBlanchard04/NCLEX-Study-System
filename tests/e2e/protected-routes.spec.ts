import { expect, test, type Page } from '@playwright/test'

const protectedRoutes = [
  { path: '/dashboard', text: /Next Action|Today.s Plan|Weak Areas/i },
  { path: '/quick-study', text: /Start 10-minute drill|Current action/i },
  { path: '/practice-questions', text: /Question Bank|Start focused set|Start adaptive set|Practice Set/i },
  { path: '/weak-areas', text: /Repair the pattern|Selected repair|No weak area signal/i },
  { path: '/test-mode', text: /Start a serious exam block|exam block/i },
  { path: '/exam-prep', text: /High-Yield Review|Test Strategy|Readiness Checks/i },
  { path: '/my-materials', text: /Your Study Library|Materials library/i },
  { path: '/study-plan', text: /Today first|Next Action/i },
]

async function dismissVisibleSession(page: Page) {
  const exitControls = page.getByRole('button', { name: /Discard|Close session/i })
  const count = await exitControls.count()
  for (let index = 0; index < count; index += 1) {
    const control = exitControls.nth(index)
    if (await control.isVisible().catch(() => false)) {
      await control.click()
      await page.waitForTimeout(300)
      return
    }
  }
}

async function clickFirstVisibleButton(page: Page, name: RegExp, label: string) {
  const controls = page.getByRole('button', { name })
  const count = await controls.count()
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index)
    if (await control.isVisible().catch(() => false)) {
      await control.scrollIntoViewIfNeeded().catch(() => undefined)
      const clicked = await control.click({ timeout: 2_000 }).then(
        () => true,
        async () => {
          const handle = await control.elementHandle({ timeout: 1_000 }).catch(() => null)
          if (!handle) return false
          await handle.evaluate((element) => {
            ;(element as HTMLElement).click()
          })
          return true
        },
      )
      if (clicked) {
        return
      }
    }
  }
  throw new Error(`${label} was not visible.`)
}

async function clickLastVisibleButton(page: Page, name: RegExp, label: string) {
  const controls = page.getByRole('button', { name })
  const count = await controls.count()
  for (let index = count - 1; index >= 0; index -= 1) {
    const control = controls.nth(index)
    if (await control.isVisible().catch(() => false)) {
      await control.click()
      return
    }
  }
  throw new Error(`${label} was not visible.`)
}

async function clickVisibleButton(page: Page, name: RegExp, label: string) {
  await clickFirstVisibleButton(page, name, label)
}

async function hasQuestionRunner(page: Page) {
  return page
    .getByRole('button', { name: /^Submit answer$/i })
    .first()
    .isVisible()
    .catch(() => false)
}

async function hasResumeExamState(page: Page) {
  return page
    .getByRole('button', { name: /Resume current block|Resume exam/i })
    .first()
    .isVisible()
    .catch(() => false)
}

async function getExamEntryState(page: Page) {
  if (await hasQuestionRunner(page)) return 'runner'
  if (await hasResumeExamState(page)) return 'resume'
  if (await page.locator('main').getByText(/Start timed exam/i).first().isVisible().catch(() => false)) {
    return 'start'
  }
  return 'loading'
}

async function createStaleExamSession(page: Page) {
  await page.goto('/test-mode')
  await expect.poll(() => getExamEntryState(page), { timeout: 12_000 }).not.toBe('loading')

  const examState = await getExamEntryState(page)
  if (examState === 'runner' || examState === 'resume') return
  await clickVisibleButton(page, /^Start exam$/i, 'Start exam')
  await expect(page.getByRole('button', { name: /^Submit answer$/i }).first()).toBeVisible()
}

async function expectQuestionRunner(page: Page) {
  await expect(page.getByRole('button', { name: /^Submit answer$/i }).first()).toBeVisible()
  await expect(page.getByText(/Question \d+ of/i).first()).toBeVisible()
}

function isRelevantConsoleIssue(message: string) {
  return !message.includes('[safe-error:cloud-sync]') && !message.includes('[safe-error:cloud-hydrate]')
}

test.describe('authenticated protected route smoke', () => {
  for (const route of protectedRoutes) {
    test(`${route.path} renders authenticated app without overflow`, async ({ page }) => {
      const consoleIssues: string[] = []
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) {
          consoleIssues.push(`${message.type()}: ${message.text()}`)
        }
      })
      page.on('pageerror', (error) => {
        consoleIssues.push(`pageerror: ${error.message}`)
      })

      await page.goto(route.path)
      await dismissVisibleSession(page)
      await page.goto(route.path)
      await expect(page).toHaveTitle(/Nurse Command/)
      await expect(page.locator('main').getByText(route.text).first()).toBeVisible()
      await expect(page.getByText(/OPEN BETA TESTING/i)).toHaveCount(0)
      await expect(page.getByText(/Local demo mode/i)).toHaveCount(0)

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyTextLength: document.body.innerText.trim().length,
      }))

      expect(layout.bodyTextLength).toBeGreaterThan(80)
      expect(layout.scrollWidth, `horizontal overflow on ${route.path}`).toBeLessThanOrEqual(
        layout.clientWidth + 1,
      )
      expect(consoleIssues).toEqual([])
    })
  }
})

test.describe('authenticated mobile navigation', () => {
  test('mobile drawer and More sheet open, route, and remain usable', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'mobile navigation smoke only runs in the mobile project')

    const consoleIssues: string[] = []
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        consoleIssues.push(`${message.type()}: ${message.text()}`)
      }
    })

    await page.goto('/dashboard')
    await expect(page.locator('main').getByText(/Next Action|Today.s Plan|Weak Areas/i).first()).toBeVisible()

    await page.getByRole('button', { name: /Open navigation/i }).click()
    await expect(page.getByRole('button', { name: /Help & Support/i }).last()).toBeVisible()
    await page.getByRole('link', { name: /Settings/i }).last().click()
    await expect(page).toHaveURL(/\/settings\/?$/)
    await expect(page.locator('main').getByText(/Manage your exam track|Profile picture|Account/i).first()).toBeVisible()

    await page.getByRole('button', { name: /^More$/i }).click()
    await expect(page.getByRole('heading', { name: /Study tools/i })).toBeVisible()
    await page.getByRole('button', { name: /Remediation/i }).click()
    await expect(page).toHaveURL(/\/weak-areas\/?$/)
    await expect(page.locator('main').getByText(/Repair the pattern|Selected repair|No weak area signal/i).first()).toBeVisible()

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
    expect(consoleIssues).toEqual([])
  })
})

test.describe('session start regression', () => {
  test('Quick Study and Question Bank start over a stale Exam session', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'session-start regression runs once on desktop')

    const consoleIssues: string[] = []
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        const issue = `${message.type()}: ${message.text()}`
        if (isRelevantConsoleIssue(issue)) {
          consoleIssues.push(issue)
        }
      }
    })
    page.on('pageerror', (error) => {
      consoleIssues.push(`pageerror: ${error.message}`)
    })

    await createStaleExamSession(page)
    await page.goto('/quick-study')
    await clickLastVisibleButton(page, /Start 10-minute drill/i, 'Start 10-minute drill')
    await expectQuestionRunner(page)

    await createStaleExamSession(page)
    await page.goto('/practice-questions')
    await clickFirstVisibleButton(page, /Start adaptive set|Start here/i, 'Start adaptive set')
    await expectQuestionRunner(page)
    await dismissVisibleSession(page)

    expect(consoleIssues).toEqual([])
  })
})
