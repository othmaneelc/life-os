import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Life OS' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('should register a new user', async ({ page }) => {
    await page.goto('/login')
    await page.getByText("Don't have an account?").click()
    await page.locator('input[autocomplete="username"]').fill(`testuser_${Date.now()}`)
    await page.locator('input[autocomplete="email"]').fill(`test_${Date.now()}@test.com`)
    await page.locator('input[autocomplete="name"]').fill('Test User')
    await page.locator('input[autocomplete="new-password"]').first().fill('TestPass123!')
    await page.locator('input[autocomplete="new-password"]').last().fill('TestPass123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })
})
