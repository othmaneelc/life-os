import { test, expect } from '@playwright/test'

test.describe('Journal', () => {
  test('should write a journal entry', async ({ page }) => {
    await page.goto('/login')
    await page.getByText("Don't have an account?").click()
    const username = `journaltest_${Date.now()}`
    await page.locator('input[autocomplete="username"]').fill(username)
    await page.locator('input[autocomplete="email"]').fill(`${username}@test.com`)
    await page.locator('input[autocomplete="name"]').fill('Journal Tester')
    await page.locator('input[autocomplete="new-password"]').first().fill('TestPass123!')
    await page.locator('input[autocomplete="new-password"]').last().fill('TestPass123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    await page.goto('/journal')
    await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible()

    const entryText = `E2E Journal entry ${Date.now()}`
    await page.locator('textarea').first().fill(entryText)
    await page.getByRole('button', { name: 'Save' }).click()
  })
})
