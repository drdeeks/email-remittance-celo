import { test, expect } from '@playwright/test';

test.describe('Send Form - Basic Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display send form with all required fields', async ({ page }) => {
    await expect(page.getByText('Send Crypto via Email')).toBeVisible();
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('recipient@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('0.00')).toBeVisible();
    await expect(page.getByText('Service Wallet')).toBeVisible();
    await expect(page.getByText('My Wallet')).toBeVisible();
  });

  test('should NOT show wallet generation on send form (claim page only)', async ({ page }) => {
    await page.getByPlaceholder('recipient@example.com').fill('recipient@example.com');
    await expect(page.getByText('Generate wallet for recipient')).not.toBeVisible();
  });

  test('should show wallet mode selection with service default', async ({ page }) => {
    await expect(page.getByText('Service Wallet').first()).toHaveClass(/bg-sky-500\/20/);
    await page.getByText('My Wallet').click();
    await expect(page.getByText('My Wallet').first()).toHaveClass(/bg-emerald-500\/20/);
  });

  test('should show chain selector with all 3 chains', async ({ page }) => {
    await expect(page.getByText('Celo')).toBeVisible();
    await expect(page.getByText('Base')).toBeVisible();
    await expect(page.getByText('Monad')).toBeVisible();
  });

  test('should show token selectors for multi-token chains', async ({ page }) => {
    await expect(page.getByText('You Send')).toBeVisible();
    await expect(page.getByText('Recipient Receives')).toBeVisible();
  });

  test('should show message input field', async ({ page }) => {
    await expect(page.getByPlaceholder('A quick note for the recipient...')).toBeVisible();
  });

  test('should disable send button when required fields are empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Send/ })).toBeDisabled();
  });

  test('should show verification required text in service mode', async ({ page }) => {
    await expect(page.getByText('Verify Identity to Send')).toBeVisible();
  });

  test('should show connect wallet prompt in personal mode', async ({ page }) => {
    await page.getByText('My Wallet').click();
    await expect(page.getByText('Connect Wallet to Send')).toBeVisible();
  });

  test('should show recipient token options', async ({ page }) => {
    await expect(page.getByText('CELO (Native)')).toBeVisible();
    await expect(page.getByText('cUSD (Celo Dollar)')).toBeVisible();
    await expect(page.getByText('USDC on Celo')).toBeVisible();
  });

  test('should show cross-chain bridge options', async ({ page }) => {
    await expect(page.getByText('ETH on Base ↗')).toBeVisible();
    await expect(page.getByText('USDC on Base ↗')).toBeVisible();
  });
});

test.describe('Send Form - Responsive', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByText('Send Crypto via Email')).toBeVisible();
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByText('Send Crypto via Email')).toBeVisible();
    await expect(page.getByPlaceholder('recipient@example.com')).toBeVisible();
  });
});
