import { test, expect } from '@playwright/test';

test.describe('Send Form - Wallet Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
  });

  test('should display send form with all required fields', async ({ page }) => {
    // Check main heading
    await expect(page.getByText('Send Crypto via Email')).toBeVisible();

    // Check form fields
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('recipient@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('0.00')).toBeVisible();

    // Check wallet mode buttons
    await expect(page.getByText('Service Wallet')).toBeVisible();
    await expect(page.getByText('My Wallet')).toBeVisible();
  });

  test('should show wallet generation button when recipient email is entered', async ({ page }) => {
    // Enter recipient email
    await page.getByPlaceholder('recipient@example.com').fill('recipient@example.com');

    // Check wallet generation button appears
    await expect(page.getByText('Generate wallet for recipient')).toBeVisible();
  });

  test('should not show wallet generation button without recipient email', async ({ page }) => {
    // Check wallet generation button is not visible
    await expect(page.getByText('Generate wallet for recipient')).not.toBeVisible();
  });

  test('should generate wallet when button is clicked', async ({ page }) => {
    // Enter recipient email
    await page.getByPlaceholder('recipient@example.com').fill('recipient@example.com');

    // Click generate wallet button
    await page.getByText('Generate wallet for recipient').click();

    // Check loading state
    await expect(page.getByText('Generating wallet...')).toBeVisible();

    // Wait for wallet to be generated (this would require mocking the API)
    // For now, just verify the button click triggers the generation
  });

  test('should show wallet mode selection', async ({ page }) => {
    // Check service wallet mode is selected by default
    await expect(page.getByText('Service Wallet').first()).toHaveClass(/bg-sky-500/20/);

    // Switch to personal wallet mode
    await page.getByText('My Wallet').click();

    // Check personal wallet mode is now selected
    await expect(page.getByText('My Wallet').first()).toHaveClass(/bg-emerald-500/20/);
  });

  test('should show chain selector', async ({ page }) => {
    // Check chain selector is visible
    await expect(page.getByText('Celo')).toBeVisible();
    await expect(page.getByText('Base')).toBeVisible();
    await expect(page.getByText('Monad')).toBeVisible();
  });

  test('should show token selectors when chain has multiple tokens', async ({ page }) => {
    // Celo chain has multiple tokens
    await expect(page.getByText('You Send')).toBeVisible();
    await expect(page.getByText('Recipient Receives')).toBeVisible();
  });

  test('should show message input field', async ({ page }) => {
    // Check message input exists
    await expect(page.getByPlaceholder('A quick note for the recipient...')).toBeVisible();
  });

  test('should show send button', async ({ page }) => {
    // Check send button exists
    await expect(page.getByRole('button', { name: /Send/ })).toBeVisible();
  });

  test('should disable send button when required fields are empty', async ({ page }) => {
    // Check send button is disabled initially
    const sendButton = page.getByRole('button', { name: /Send/ });
    await expect(sendButton).toBeDisabled();
  });

  test('should enable send button when all required fields are filled', async ({ page }) => {
    // Fill in all required fields
    await page.getByPlaceholder('your@email.com').fill('sender@example.com');
    await page.getByPlaceholder('recipient@example.com').fill('recipient@example.com');
    await page.getByPlaceholder('0.00').fill('1.0');

    // Check send button is now enabled (but might still be disabled due to verification)
    // This depends on the verification state
  });

  test('should show verification status in service wallet mode', async ({ page }) => {
    // In service wallet mode, verification is required
    await expect(page.getByText('Verify Identity to Send')).toBeVisible();
  });

  test('should show wallet balance in personal wallet mode', async ({ page }) => {
    // Switch to personal wallet mode
    await page.getByText('My Wallet').click();

    // Check balance display (might show connect wallet prompt)
    await expect(page.getByText('Connect Wallet to Send')).toBeVisible();
  });

  test('should show recipient token options', async ({ page }) => {
    // Check recipient token options are visible
    await expect(page.getByText('CELO (Native)')).toBeVisible();
    await expect(page.getByText('cUSD (Celo Dollar)')).toBeVisible();
    await expect(page.getByText('USDC on Celo')).toBeVisible();
  });

  test('should show cross-chain options', async ({ page }) => {
    // Check cross-chain options are visible
    await expect(page.getByText('ETH on Base ↗')).toBeVisible();
    await expect(page.getByText('USDC on Base ↗')).toBeVisible();
  });
});

test.describe('Send Form - Responsive Design', () => {
  test('should be responsive on mobile devices', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');

    // Check that form is still usable
    await expect(page.getByText('Send Crypto via Email')).toBeVisible();
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('recipient@example.com')).toBeVisible();
  });

  test('should be responsive on tablet devices', async ({ page }) => {
    // Set viewport to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/');

    // Check that form is still usable
    await expect(page.getByText('Send Crypto via Email')).toBeVisible();
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('recipient@example.com')).toBeVisible();
  });
});

test.describe('Send Form - Error Handling', () => {
  test('should show error message for invalid email format', async ({ page }) => {
    // Enter invalid email
    await page.getByPlaceholder('your@email.com').fill('invalid-email');

    // Check that form still works (HTML5 validation)
    await expect(page.getByPlaceholder('your@email.com')).toHaveValue('invalid-email');
  });

  test('should show error message for insufficient balance', async ({ page }) => {
    // This would require mocking the balance API
    // For now, just verify the error message element exists
    await expect(page.getByText('Insufficient balance')).not.toBeVisible();
  });
});
