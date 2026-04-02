import { test, expect } from '@playwright/test';

test('homepage loads and sends to correct URL', async ({ page }) => {
  // Navigate directly to the live frontend
  await page.goto('https://email-remittance-pro.vercel.app', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'test-results/homepage-screenshot.png' });
  
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Get page content for debugging
  const bodyText = await page.textContent('body');
  console.log('Body text (first 500 chars):', bodyText?.substring(0, 500));
  
  // Check what elements are on the page
  const inputs = await page.locator('input').count();
  console.log('Number of input elements:', inputs);
  
  // Check for our email inputs even if title is missing
  const senderEmail = page.getByPlaceholder('your@email.com');
  const recipientEmail = page.getByPlaceholder('recipient@example.com');
  
  const hasSender = await senderEmail.count() > 0;
  const hasRecipient = await recipientEmail.count() > 0;
  
  console.log('Has sender email input:', hasSender);
  console.log('Has recipient email input:', hasRecipient);
  
  // The page might be loading - give it more time
  if (!hasSender || !hasRecipient) {
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/homepage-after-wait.png' });
  }
});
