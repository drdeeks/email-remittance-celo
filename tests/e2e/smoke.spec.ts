import { test, expect } from '@playwright/test';

test('homepage loads with SendForm and sender email input', async ({ page }) => {
  await page.goto('/');
  // Check page title
  await expect(page).toHaveTitle(/Email Remittance/i);
  // Verify the sender email input is visible with placeholder
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  // Also check recipient email field exists
  await expect(page.getByPlaceholder('recipient@example.com')).toBeVisible();
});
