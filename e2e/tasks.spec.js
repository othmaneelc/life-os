import { test, expect } from '@playwright/test'

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByText("Don't have an account?").click()
    const username = `tasktest_${Date.now()}`
    await page.locator('input[autocomplete="username"]').fill(username)
    await page.locator('input[autocomplete="email"]').fill(`${username}@test.com`)
    await page.locator('input[autocomplete="name"]').fill('Task Tester')
    await page.locator('input[autocomplete="new-password"]').first().fill('TestPass123!')
    await page.locator('input[autocomplete="new-password"]').last().fill('TestPass123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should create a task', async ({ page }) => {
    await page.goto('/tasks')
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()

    const taskTitle = `E2E Test Task ${Date.now()}`
    await page.locator('input[placeholder="Add a new task..."]').fill(taskTitle)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 })
  })
})
