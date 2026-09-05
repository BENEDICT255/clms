import { test, expect } from '@playwright/test';

test.describe('Authentication Journeys', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole('heading', { name: /sign in to clms/i })).toBeVisible();
  });

  test('login page shows validation alert when submitting empty credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/please enter both your corporate email and password/i)).toBeVisible();
  });
});
