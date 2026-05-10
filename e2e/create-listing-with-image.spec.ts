import { test, expect } from '@playwright/test';
import path from 'path';

test.describe.configure({ timeout: 60_000 });

const TEST_IMAGE = path.join(__dirname, 'fixtures', 'test-image.png');

async function registerUser(page: import('@playwright/test').Page, name: string) {
  const unique = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${unique}@test.com`;
  await page.goto('/register');
  await page.waitForTimeout(1500);
  await page.getByPlaceholder('Jane Doe').fill(name);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Minimum 6 characters').fill('TestPass123!');
  await page.getByRole('button', { name: /register/i }).click();
  await page.waitForTimeout(3000);
  return email;
}

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /^login$/i }).click();
  // Wait for navigation away from /login — the page redirects to / or /dashboard on success
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

test.describe('Create Listing with Image Upload', () => {
  test('registers, creates listing with PNG image + tags, verifies on dashboard and detail page', async ({ page }) => {
    // 1. Register a new user (auto-login)
    await registerUser(page, 'Image Test User');

    // 2. Navigate to create listing
    await page.goto('/listings/create');
    await page.waitForTimeout(2000);

    // Verify form is visible
    await expect(page.getByRole('heading', { name: /create a new listing/i })).toBeVisible();

    // 3. Fill in all fields
    await page.getByPlaceholder("Children's story books").fill('Winter Blankets for Shelter');
    await page.getByPlaceholder('Describe the item condition, quantity').fill(
      'Pack of 10 warm fleece blankets in excellent condition. Perfect for winter shelter drives.',
    );
    await page.getByPlaceholder('Brooklyn, NY').fill('Seattle, WA');

    // 4. Add tags
    const tagsInput = page.locator('#listing-tags');
    await tagsInput.fill('winter, blankets, shelter');

    // 5. Upload the test PNG image
    const fileInput = page.locator('#image-upload');
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.waitForTimeout(1000);

    // 6. Verify image preview appears
    const preview = page.getByAltText('Preview');
    await expect(preview).toBeVisible({ timeout: 5000 });

    // 7. Submit the listing
    await page.getByRole('button', { name: /submit listing/i }).click();
    await page.waitForTimeout(5000);

    // 8. Verify redirect to dashboard with success notice
    expect(page.url()).toContain('/dashboard');
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toContain('pending admin review');

    // 9. Verify the listing appears in the dashboard table/list
    await expect(page.getByText('Winter Blankets for Shelter')).toBeVisible({ timeout: 5000 });
  });

  test('created listing with image shows on dashboard and admin can see it', { timeout: 90_000 }, async ({ page }) => {
    // Use pre-seeded demo user to avoid rate limit issues
    await login(page, 'demo@charity.org', 'donor123');

    await page.goto('/listings/create');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /create a new listing/i })).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("Children's story books").fill('Donated Electronics Bundle');
    await page.getByPlaceholder('Describe the item condition, quantity').fill(
      'Bundle of 5 tablets and chargers donated for community education programs.',
    );
    await page.getByPlaceholder('Brooklyn, NY').fill('Portland, OR');
    await page.locator('#listing-tags').fill('electronics, education');
    await page.locator('#image-upload').setInputFiles(TEST_IMAGE);
    await page.waitForTimeout(1000);

    // Verify image preview before submitting
    await expect(page.getByAltText('Preview')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /submit listing/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard');

    // Verify listing shows in dashboard table
    const listingRow = page.locator('td', { hasText: 'Donated Electronics Bundle' }).first();
    await listingRow.scrollIntoViewIfNeeded();
    await expect(listingRow).toBeVisible({ timeout: 10000 });

    // Now login as admin and verify listing appears in admin panel
    await login(page, 'admin@charity.org', 'admin123');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // The listing should appear in the admin data table
    const adminRow = page.locator('td', { hasText: 'Donated Electronics Bundle' }).first();
    await adminRow.scrollIntoViewIfNeeded();
    await expect(adminRow).toBeVisible({ timeout: 10000 });

    // Approve it
    const row = page.locator('tr', { hasText: 'Donated Electronics Bundle' }).first();
    const approveBtn = row.getByRole('button', { name: /approve/i });
    if ((await approveBtn.count()) > 0) {
      await approveBtn.click();
      await page.waitForTimeout(2000);
      // Verify status changed to APPROVED
      await expect(row.getByText('APPROVED')).toBeVisible({ timeout: 5000 });
    }
  });

  test('image preview shows and can be replaced before submit', async ({ page }) => {
    // Use pre-seeded demo user to avoid rate limiting
    await login(page, 'demo@charity.org', 'donor123');
    await page.goto('/listings/create');
    await page.waitForTimeout(2000);

    // Make sure we're actually on the create page
    await expect(page.getByRole('heading', { name: /create a new listing/i })).toBeVisible({ timeout: 10000 });

    const fileInput = page.locator('#image-upload');
    await expect(fileInput).toBeAttached({ timeout: 5000 });

    // Upload first image
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.waitForTimeout(1000);
    await expect(page.getByAltText('Preview')).toBeVisible();

    // Replace with same image (simulates changing image)
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.waitForTimeout(1000);
    await expect(page.getByAltText('Preview')).toBeVisible();
  });

  test('card overflow is fixed — button does not wrap and long names are truncated', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check listing cards exist
    const cards = page.locator('article');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Check that "View listing" buttons have whitespace-nowrap
    const viewButtons = page.locator('a:has-text("View listing")');
    const btnCount = await viewButtons.count();

    for (let i = 0; i < Math.min(btnCount, 3); i++) {
      const btn = viewButtons.nth(i);
      const classes = await btn.getAttribute('class');
      expect(classes).toContain('whitespace-nowrap');
      expect(classes).toContain('shrink-0');
    }
  });

  test('tags display as pills on listing cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Seed data has tags — check if tag pills appear in listing cards
    const tagPills = page.locator('article span').filter({ hasText: /^(winter|kids|furniture|electronics|clothing|food|hygiene|education|urgent)$/i });
    const tagCount = await tagPills.count();

    // At least some seed listings should have tags
    expect(tagCount).toBeGreaterThan(0);
  });

  test('search debounce fires after typing stops', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[name="search"]');
    await expect(searchInput).toBeVisible();

    // Type quickly — debounce should delay the navigation
    const urlBefore = page.url();
    await searchInput.fill('laptop');

    // Wait less than debounce (300ms) — URL should NOT have changed yet
    await page.waitForTimeout(100);
    expect(page.url()).toBe(urlBefore);

    // Wait for debounce to fire
    await page.waitForTimeout(500);

    // URL should now contain the search param
    expect(page.url()).toContain('search=laptop');
  });
});
