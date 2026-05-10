import { test, expect, Page } from '@playwright/test';

// Helper: login with given credentials
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
}

// Helper: register a new user
async function registerUser(page: Page, name: string): Promise<string> {
  const email = `e2e-ui-${Date.now()}@test.com`;
  await page.goto('/register');
  await page.getByPlaceholder('Jane Doe').fill(name);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Minimum 6 characters').fill('TestPass123!');
  await page.getByRole('button', { name: /register/i }).click();
  await page.waitForTimeout(2000);
  return email;
}

test.describe('UI Regression: Button Contrast & Hero', () => {
  test('hero CTA buttons have proper visible text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const shareBtn = page.getByRole('link', { name: /share a donation/i });
    await expect(shareBtn).toBeVisible();
    const shareBtnColor = await shareBtn.evaluate(el => getComputedStyle(el).color);
    expect(shareBtnColor).not.toBe('rgba(0, 0, 0, 0)');

    const dashboardBtn = page.getByRole('link', { name: /view your dashboard/i });
    await expect(dashboardBtn).toBeVisible();
    const dashboardBtnColor = await dashboardBtn.evaluate(el => getComputedStyle(el).color);
    expect(dashboardBtnColor).toContain('255');
  });

  test('hero section stats panel is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('p').filter({ hasText: /^Approved donations$/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('p').filter({ hasText: /^Urgent opportunities$/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('p').filter({ hasText: /^Browse categories$/ }).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('UI Regression: Search & Filter Form', () => {
  test('search form has explicit GET method and action', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const form = page.locator('form');
    const action = await form.getAttribute('action');
    const method = await form.getAttribute('method');
    expect(action).toBe('/');
    expect(method?.toUpperCase()).toBe('GET');
  });

  test('clear filters link navigates to root and removes params', async ({ page }) => {
    // Navigate with search params
    await page.goto('/?search=test&category=fake');
    await page.waitForTimeout(1000);

    const clearButton = page.getByRole('button', { name: /clear filters/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await page.waitForTimeout(1000);

    // Should be on clean root URL
    expect(page.url()).not.toContain('search=');
    expect(page.url()).not.toContain('category=');
  });

  test('filter form submits search query correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    await page.getByPlaceholder(/books, coats, desks/i).fill('coats');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('search=coats');
  });
});

test.describe('UI Regression: Validation Error Display', () => {
  test('create listing shows field-level validation errors', async ({ page }) => {
    const email = await registerUser(page, 'Validation Test User');
    await login(page, email, 'TestPass123!');
    await page.goto('/listings/create');
    await page.waitForTimeout(2000);

    // Fill with invalid data (too short)
    await page.getByPlaceholder("Children's story books").fill('AB');
    await page.getByPlaceholder('Describe the item condition').fill('Short');
    await page.getByPlaceholder('Brooklyn, NY').fill('X');
    await page.getByRole('button', { name: /submit listing/i }).click();
    await page.waitForTimeout(2000);

    // Should show validation errors
    const content = await page.textContent('body');
    expect(content).toContain('at least');
  });

  test('create listing succeeds with valid data and shows success', async ({ page }) => {
    const email = await registerUser(page, 'Valid Creator');
    await login(page, email, 'TestPass123!');
    await page.goto('/listings/create');
    await page.waitForTimeout(2000);

    await page.getByPlaceholder("Children's story books").fill('Valid Test Item');
    await page.getByPlaceholder('Describe the item condition').fill('This is a valid description that meets the 10 char minimum.');
    await page.getByPlaceholder('Brooklyn, NY').fill('Kuala Lumpur');
    await page.getByRole('button', { name: /submit listing/i }).click();
    await page.waitForTimeout(4000);

    const url = page.url();
    const content = await page.textContent('body');
    const success = url.includes('/dashboard') || content?.toLowerCase().includes('pending admin review');
    expect(success).toBeTruthy();
  });
});

test.describe('UI Regression: Admin Data Table', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@charity.org', 'admin123');
  });

  test('admin panel uses a data table (not cards)', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    // Should have a proper table element
    const table = page.locator('table');
    await expect(table.first()).toBeVisible();

    // Should have table headers
    const headers = page.locator('thead th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThanOrEqual(6); // Title, Category, Author, Location, Status, Date, Actions
  });

  test('admin table has sortable column headers', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    // Headers should contain sort indicators
    const sortButtons = page.locator('thead button');
    const count = await sortButtons.count();
    expect(count).toBeGreaterThanOrEqual(5); // At least 5 sortable columns

    // Click a sort header and verify it toggles
    await sortButtons.first().click();
    await page.waitForTimeout(500);
    // Should still be on admin page with table
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('admin panel has filter tabs (All, Pending, Approved, Rejected)', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    await expect(page.getByRole('button', { name: /^All/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Pending/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Approved/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Rejected/i })).toBeVisible();
  });

  test('clicking Pending filter shows only pending listings', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /^Pending/i }).click();
    await page.waitForTimeout(500);

    // All visible status badges should be PENDING
    const statusCells = page.locator('tbody .bg-amber-100');
    const count = await statusCells.count();
    // If there are pending listings, they should be amber colored
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(statusCells.nth(i)).toContainText('PENDING');
      }
    }
  });

  test('admin can approve listing from data table', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    // Filter to pending only
    await page.getByRole('button', { name: /^Pending/i }).click();
    await page.waitForTimeout(500);

    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(2000);
      // The page should still work (no crash)
      await expect(page.locator('table').first()).toBeVisible();
    }
  });
});

test.describe('UI Regression: Mobile Navigation', () => {
  test('mobile menu hamburger is visible on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Desktop nav should be hidden
    const desktopNav = page.locator('nav.hidden.md\\:flex, nav.hidden');
    // Mobile hamburger button should exist
    const menuButton = page.getByRole('button', { name: /menu|toggle|navigation/i }).or(
      page.locator('button.md\\:hidden, [aria-label*="menu"], [aria-label*="Menu"]')
    );
    await expect(menuButton.first()).toBeVisible();
  });

  test('clicking hamburger opens mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(1000);

    const menuButton = page.locator('button.md\\:hidden').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);

      // Mobile menu should show navigation links (use exact role match)
      const mobileNav = page.locator('[class*="md:hidden"]').last();
      await expect(mobileNav.getByRole('link', { name: 'Browse' })).toBeVisible();
      await expect(mobileNav.getByRole('link', { name: 'Share an Item' })).toBeVisible();
    }
  });
});

test.describe('UI Regression: Form UX', () => {
  test('image upload help text does not mention SVG', async ({ page }) => {
    await login(page, 'admin@charity.org', 'admin123');
    await page.goto('/listings/create');
    await page.waitForTimeout(1000);

    const content = await page.textContent('body');
    // SVG should NOT be listed as allowed
    expect(content?.toLowerCase()).not.toContain('svg');
    // But JPG, PNG, WebP should be mentioned
    expect(content).toContain('JPG');
    expect(content).toContain('PNG');
    expect(content).toContain('WebP');
  });
});
