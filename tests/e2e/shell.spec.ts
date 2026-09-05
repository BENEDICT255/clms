import { test, expect } from '@playwright/test';

test.describe('Application Shell & Responsive Navigation', () => {
  test('login page responds gracefully at standard enterprise viewports', async ({ page }) => {
    // Test at 1366x768 (DESIGN.md baseline)
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to clms/i })).toBeVisible();

    // Test at 1920x1080 (HD desktop)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByRole('heading', { name: /sign in to clms/i })).toBeVisible();
  });
});
