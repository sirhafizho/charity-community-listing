import path from 'path';
import { test, expect, type Locator, type Page } from '@playwright/test';

test.setTimeout(120_000);

const TEST_IMAGE = path.join(__dirname, 'fixtures', 'test-image.png');
const DEMO_USER = { email: 'demo@charity.org', password: 'donor123' };
const ADMIN_USER = { email: 'admin@charity.org', password: 'admin123' };
const MEMBER_USER = { email: 'member@charity.org', password: 'community123' };

async function expectVisible(locator: Locator) {
  const target = locator.first();
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();
}

function uniqueValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

async function logoutIfNeeded(page: Page) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function loginAs(page: Page, email: string, password: string) {
  await logoutIfNeeded(page);
  await login(page, email, password);
}

async function registerFreshUser(page: Page) {
  const email = `${uniqueValue('sprint3-user')}@example.com`;
  const password = 'TestPass123!';

  await logoutIfNeeded(page);
  await page.goto('/register');
  await page.getByPlaceholder('Jane Doe').fill('Sprint 3 Empty State User');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Minimum 6 characters').fill(password);
  await page.getByRole('button', { name: 'Register' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 20_000 });
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login')) {
    await login(page, email, password);
  }

  return { email, password };
}

async function createListing(page: Page, options?: {
  titlePrefix?: string;
  condition?: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  description?: string;
}) {
  const title = uniqueValue(options?.titlePrefix ?? 'Sprint 3 listing');
  const description = options?.description ?? 'Freshly added donation for Sprint 3 end-to-end coverage.';
  const condition = options?.condition ?? 'NEW';

  await page.goto('/listings/create');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Description').fill(description);
  await page.getByLabel('Location').fill('Queens, NY');
  await page.getByLabel('Condition').selectOption(condition);
  await page.getByLabel('Tags').fill('sprint3, e2e');
  await page.locator('#image-upload').setInputFiles(TEST_IMAGE);

  const preview = page.getByAltText('Preview');
  await expectVisible(preview);

  await page.getByRole('button', { name: 'Submit listing' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');

  const successNotice = page.locator('#main-content').getByText('Your listing is pending admin review.').first();
  await expectVisible(successNotice);

  const row = page.locator('tr', { hasText: title }).first();
  await expectVisible(row);

  const detailPath = await row.getByRole('link', { name: 'View listing' }).getAttribute('href');
  expect(detailPath).toBeTruthy();

  return { title, detailPath: detailPath as string };
}

async function approveListingAsAdmin(page: Page, title: string) {
  await loginAs(page, ADMIN_USER.email, ADMIN_USER.password);
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');

  const row = page.locator('tr', { hasText: title }).first();
  await expectVisible(row);
  await row.getByRole('button', { name: 'Approve' }).click();
  await page.waitForLoadState('networkidle');
  await expect(row.getByText('APPROVED', { exact: true })).toBeVisible();
}

async function createApprovedListing(page: Page, titlePrefix: string, condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' = 'NEW') {
  await loginAs(page, DEMO_USER.email, DEMO_USER.password);
  const listing = await createListing(page, {
    titlePrefix,
    condition,
    description: 'A unique listing created by the seeded donor so Sprint 3 flows can run safely.',
  });
  await approveListingAsAdmin(page, listing.title);
  return listing;
}

test.describe('Sprint 3 homepage enhancements', () => {
  test('shows condition badges on listing cards with badge styling', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const badge = page.locator('article span').filter({ hasText: /^(Good|New|Like New|Fair)$/ }).first();
    await expectVisible(badge);
    await expect(badge).toHaveText(/^(Good|New|Like New|Fair)$/);

    const styles = await badge.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        color: computed.color,
      };
    });

    expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(parseFloat(styles.borderRadius)).toBeGreaterThan(0);
    expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('shows relative time labels for approved listings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const relativeTime = page.locator('article time').first();
    await expectVisible(relativeTime);
    await expect(relativeTime).toHaveText(/(just now|\d+ min ago|\d+ hours? ago|\d+ days? ago|[A-Z][a-z]{2} \d{1,2}, \d{4})/);
    await expect(relativeTime).toHaveAttribute('datetime', /.+/);
  });
});

test.describe('Sprint 3 listing creation and reporting', () => {
  test('creates a listing with a condition field and shows the condition badge after admin approval', async ({ page }) => {
    await loginAs(page, DEMO_USER.email, DEMO_USER.password);
    const listing = await createListing(page, {
      titlePrefix: 'Sprint 3 condition listing',
      condition: 'NEW',
      description: 'Brand new care package items for community outreach.',
    });

    await approveListingAsAdmin(page, listing.title);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const card = page.locator('article', { hasText: listing.title }).first();
    await expectVisible(card);
    await expect(card.getByText('New', { exact: true })).toBeVisible();

    await page.goto(listing.detailPath);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New', { exact: true }).first()).toBeVisible();
  });

  test('submits a report for an approved listing', async ({ page }) => {
    const listing = await createApprovedListing(page, 'Sprint 3 report listing', 'GOOD');

    await loginAs(page, MEMBER_USER.email, MEMBER_USER.password);
    await page.goto(listing.detailPath);
    await page.waitForLoadState('networkidle');

    const reportButton = page.getByRole('button', { name: 'Report' });
    await expectVisible(reportButton);
    await reportButton.click();

    await page.getByLabel('Spam').check();
    await page.getByLabel('Additional details (optional)').fill('This report was submitted by the Playwright Sprint 3 suite.');
    await page.getByRole('button', { name: 'Submit report' }).click();

    const successMessage = page.getByText('Report submitted. Thank you.');
    await expectVisible(successMessage);
  });
});

test.describe('Sprint 3 dashboard and claim flows', () => {
  test('loads the impact dashboard with stats and badges for the donor account', async ({ page }) => {
    await loginAs(page, DEMO_USER.email, DEMO_USER.password);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const impactHeading = page.getByRole('heading', { name: "See the difference you're making" });
    await expectVisible(impactHeading);
    await expect(page.getByText('Items Donated')).toBeVisible();
    await expect(page.getByText('People Helped')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible();
    await expect(page.getByText(/badges earned/i)).toBeVisible();
  });

  test('completes the claim lifecycle from submitted to fulfilled', async ({ page }) => {
    const listing = await createApprovedListing(page, 'Sprint 3 claim lifecycle', 'LIKE_NEW');

    await loginAs(page, MEMBER_USER.email, MEMBER_USER.password);
    await page.goto(listing.detailPath);
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Message to the donor').fill('Our centre can distribute this donation to families this week.');
    await page.getByRole('button', { name: 'Submit claim' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Your claim is already submitted')).toBeVisible();

    await loginAs(page, DEMO_USER.email, DEMO_USER.password);
    await page.goto(listing.detailPath);
    await page.waitForLoadState('networkidle');

    const ownerView = page.getByRole('heading', { name: 'Claims on this item' });
    await expectVisible(ownerView);
    await expect(page.getByText(MEMBER_USER.email)).toBeVisible();

    await page.getByRole('button', { name: 'Approve' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('CLAIMED', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    const fulfillButton = page.getByRole('button', { name: /Fulfill|Mark Fulfilled/ }).first();
    await expectVisible(fulfillButton);
    await fulfillButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('FULFILLED', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty states for a newly registered user dashboard', async ({ page }) => {
    await registerFreshUser(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const listingsEmptyState = page.getByText('No listings yet');
    await expectVisible(listingsEmptyState);
    await expect(page.getByText('📦')).toBeVisible();

    const myClaimsTab = page.getByRole('button', { name: /My Claims/ });
    await expectVisible(myClaimsTab);
    await myClaimsTab.click();

    const claimsEmptyState = page.getByText('No claims yet');
    await expectVisible(claimsEmptyState);
    await expect(page.getByText('🤲')).toBeVisible();
  });
});

test.describe('Sprint 3 admin moderation', () => {
  test('exposes reports moderation access for admin users', async ({ page }) => {
    await loginAs(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const reportsControl = page.locator('button, a').filter({ hasText: /^Reports$/i }).first();

    if ((await reportsControl.count()) > 0) {
      await expectVisible(reportsControl);
    } else {
      const reportsResponse = await page.evaluate(async () => {
        const response = await fetch('/api/reports', {
          credentials: 'include',
        });

        return {
          status: response.status,
          body: await response.json(),
        };
      });

      expect(reportsResponse.status).toBe(200);
      expect(reportsResponse.body.success).toBe(true);
      expect(Array.isArray(reportsResponse.body.data)).toBe(true);
    }
  });
});
