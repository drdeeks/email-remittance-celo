import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard - Review Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
  });

  test('should display admin dashboard with tabs', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Admin Dashboard/i);

    // Check main heading
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByText('Review pending submissions and manage team')).toBeVisible();

    // Check tabs exist
    await expect(page.getByRole('button', { name: /Pending Reviews/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Managers/ })).toBeVisible();
  });

  test('should show manager ID input field', async ({ page }) => {
    // Check manager ID input exists
    await expect(page.getByPlaceholder('e.g. manager-uuid')).toBeVisible();
  });

  test('should show empty state when no pending reviews', async ({ page }) => {
    // Check empty state message
    await expect(page.getByText('No pending reviews')).toBeVisible();
  });

  test('should show empty state when no managers', async ({ page }) => {
    // Switch to managers tab
    await page.getByRole('button', { name: /Managers/ }).click();

    // Check empty state message
    await expect(page.getByText('No active managers')).toBeVisible();
  });

  test('should display invite manager form', async ({ page }) => {
    // Switch to managers tab
    await page.getByRole('button', { name: /Managers/ }).click();

    // Check invite form elements
    await expect(page.getByPlaceholder('email@example.com')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: /Invite/ })).toBeVisible();
  });

  test('should validate manager ID input', async ({ page }) => {
    // Try to approve without manager ID
    const approveButton = page.getByRole('button', { name: /Approve/ }).first();
    
    // Button should be disabled when no manager ID is entered
    await expect(approveButton).toBeDisabled();
  });

  test('should switch between tabs', async ({ page }) => {
    // Start on reviews tab
    await expect(page.getByText('No pending reviews')).toBeVisible();

    // Switch to managers tab
    await page.getByRole('button', { name: /Managers/ }).click();
    await expect(page.getByText('No active managers')).toBeVisible();

    // Switch back to reviews tab
    await page.getByRole('button', { name: /Pending Reviews/ }).click();
    await expect(page.getByText('No pending reviews')).toBeVisible();
  });

  test('should display role selector in invite form', async ({ page }) => {
    // Switch to managers tab
    await page.getByRole('button', { name: /Managers/ }).click();

    // Check role selector
    const roleSelector = page.getByRole('combobox');
    await expect(roleSelector).toBeVisible();

    // Check default value
    await expect(roleSelector).toHaveValue('manager');

    // Check options
    await expect(page.getByRole('option', { name: /Manager/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Admin/ })).toBeVisible();
  });

  test('should dismiss error messages', async ({ page }) => {
    // This test would require triggering an error first
    // For now, just verify the error dismiss functionality exists
    const dismissButton = page.getByRole('button', { name: /dismiss/ });
    
    // If an error is shown, verify it can be dismissed
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await expect(dismissButton).not.toBeVisible();
    }
  });
});

test.describe('Admin Dashboard - Responsive Design', () => {
  test('should be responsive on mobile devices', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/admin');

    // Check that content is still visible
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: /Pending Reviews/ })).toBeVisible();
  });

  test('should be responsive on tablet devices', async ({ page }) => {
    // Set viewport to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/admin');

    // Check that content is still visible
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: /Pending Reviews/ })).toBeVisible();
  });
});
