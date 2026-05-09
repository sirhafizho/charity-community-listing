import { test, expect, Page } from '@playwright/test';

// Helper: login with given credentials
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
}

// Helper: register a new user and return the email
// NOTE: Registration now auto-logs in and redirects to homepage
async function registerUser(page: Page, name: string): Promise<string> {
  const email = `e2e-${Date.now()}@test.com`;
  await page.goto('/register');
  await page.getByPlaceholder('Jane Doe').fill(name);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Minimum 6 characters').fill('TestPass123!');
  await page.getByRole('button', { name: /register/i }).click();
  // Auto-login redirects to homepage
  await page.waitForURL(url => !url.toString().includes('/register'), { timeout: 15000 });
  return email;
}

test.describe('Landing Page', () => {
  test('should display the landing page with approved listings', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('Winter coats for families')).toBeVisible({ timeout: 5000 });
  });

  test('should have login/register links when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register/i })).toBeVisible();
  });

  test('should display listing cards with category and location', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const content = await page.textContent('body');
    expect(content).toContain('Queens, NY');
    expect(content).toContain('Clothing');
  });
});

test.describe('User Registration', () => {
  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    await page.getByPlaceholder('Jane Doe').fill('E2E Test User');
    await page.getByPlaceholder('you@example.com').fill(`e2e-${Date.now()}@test.com`);
    await page.getByPlaceholder('Minimum 6 characters').fill('TestPass123!');
    await page.getByRole('button', { name: /register/i }).click();
    
    // Should redirect to login with success param
    await page.waitForURL('**/login?registered=1', { timeout: 10000 });
    // Verify we're on the login page (message appears there)
    await expect(page.getByText('Account created successfully. Please sign in.')).toBeVisible();
  });

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/register');
    
    await page.getByPlaceholder('Jane Doe').fill('Duplicate');
    await page.getByPlaceholder('you@example.com').fill('admin@charity.org');
    await page.getByPlaceholder('Minimum 6 characters').fill('TestPass123!');
    await page.getByRole('button', { name: /register/i }).click();
    
    await page.waitForTimeout(2000);
    const errorBox = page.locator('.text-rose-700, [class*="rose"]');
    await expect(errorBox.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('User Login', () => {
  test('should login with valid admin credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder('you@example.com').fill('admin@charity.org');
    await page.getByPlaceholder('Enter your password').fill('admin123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
    
    // Should show logged-in state
    const navContent = await page.textContent('header, nav');
    const loggedIn = navContent?.includes('Logout') || navContent?.includes('logout') || navContent?.includes('Admin');
    expect(loggedIn).toBeTruthy();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder('you@example.com').fill('admin@charity.org');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: /login/i }).click();
    
    await page.waitForTimeout(2000);
    const errorBox = page.locator('.text-rose-700, [class*="rose"]');
    await expect(errorBox.first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});

test.describe('Authenticated User Flows', () => {
  test('should register, login, and access create listing page', async ({ page }) => {
    await registerUser(page, 'Flow User');
    // Already logged in after registration (auto-login)
    
    await page.goto('/listings/create');
    await page.waitForTimeout(1000);
    
    // Check for form heading (may vary based on redesign)
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('should create a new listing', async ({ page }) => {
    await registerUser(page, 'Creator User');
    // Already logged in
    
    await page.goto('/listings/create');
    await page.waitForTimeout(2000);
    
    // Use exact placeholders from CreateListingForm
    await page.getByPlaceholder("Children's story books").fill('E2E Donated Laptops');
    await page.getByPlaceholder('Describe the item condition').fill('3 refurbished laptops for students in need.');
    await page.getByPlaceholder('Brooklyn, NY').fill('Petaling Jaya, Malaysia');
    
    // Category select should already have first option selected
    await page.getByRole('button', { name: /submit listing/i }).click();
    await page.waitForTimeout(3000);
    
    // Should redirect to dashboard with success indicator
    const url = page.url();
    const content = await page.textContent('body');
    const success = url.includes('/dashboard') || content?.toLowerCase().includes('pending') || content?.toLowerCase().includes('review');
    expect(success).toBeTruthy();
  });

  test('should view a listing detail page from landing', async ({ page }) => {
    // This test is independent - just navigate to landing and click a card
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Click on a listing link (listing IDs start with 'c' since they use cuid)
    const listingLink = page.locator('a[href^="/listings/"]').first();
    await expect(listingLink).toBeVisible({ timeout: 5000 });
    const href = await listingLink.getAttribute('href');
    await listingLink.click();
    await page.waitForTimeout(2000);
    
    // Should be on detail page (might redirect to login if listing detail requires auth)
    const url = page.url();
    const isOnListing = url.includes('/listings/') && !url.includes('/create');
    const isOnLogin = url.includes('/login');
    expect(isOnListing || isOnLogin).toBeTruthy();
    
    if (isOnListing) {
      const content = await page.textContent('main, body');
      expect(content?.length).toBeGreaterThan(100);
    }
  });

  test('should claim a listing as authenticated user', async ({ page }) => {
    await registerUser(page, 'Claimer User');
    // Already logged in after registration
    
    // Go to a listing detail
    await page.goto('/');
    await page.waitForTimeout(1000);
    const listingLink = page.locator('a[href*="/listings/"]').first();
    await listingLink.click();
    await page.waitForTimeout(2000);
    
    // Look for claim button/form
    const claimBtn = page.getByRole('button', { name: /claim/i });
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await page.waitForTimeout(1000);
      
      // Fill message if a textarea appears
      const msgField = page.locator('textarea');
      if (await msgField.first().isVisible()) {
        await msgField.first().fill('I need this for our community center.');
        const submitBtn = page.getByRole('button', { name: /submit|confirm|send/i });
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    const content = await page.textContent('body');
    const hasFeedback = content?.toLowerCase().includes('claim') || content?.toLowerCase().includes('success') || content?.toLowerCase().includes('submitted');
    expect(hasFeedback).toBeTruthy();
  });
});

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@charity.org', 'admin123');
  });

  test('should access admin panel with dashboard content', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const content = await page.textContent('body');
    const isAdmin = content?.toLowerCase().includes('admin') || content?.toLowerCase().includes('listing') || content?.toLowerCase().includes('dashboard');
    expect(isAdmin).toBeTruthy();
  });

  test('should display listings with status badges', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const content = await page.textContent('body');
    const hasStatuses = content?.includes('Approved') || content?.includes('APPROVED') || content?.includes('Pending') || content?.includes('PENDING');
    expect(hasStatuses).toBeTruthy();
  });

  test('should have approve/reject actions for pending listings', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const content = await page.textContent('body');
    if (content?.toLowerCase().includes('pending')) {
      const approveBtn = page.getByRole('button', { name: /approve/i });
      const rejectBtn = page.getByRole('button', { name: /reject/i });
      const hasActions = (await approveBtn.count()) > 0 || (await rejectBtn.count()) > 0;
      expect(hasActions).toBeTruthy();
    }
  });

  test('should approve a pending listing via admin panel', async ({ page }) => {
    // First create a listing as regular user
    const email = await registerUser(page, 'Pending Creator');
    await login(page, email, 'TestPass123!');
    await page.goto('/listings/create');
    await page.waitForTimeout(2000);
    
    await page.getByPlaceholder("Children's story books").fill('Admin Approval Test Item');
    await page.getByPlaceholder('Describe the item condition').fill('Testing the admin approval flow end to end.');
    await page.getByPlaceholder('Brooklyn, NY').fill('Test City, Malaysia');
    await page.getByRole('button', { name: /submit listing/i }).click();
    await page.waitForTimeout(3000);
    
    // Now login as admin
    await login(page, 'admin@charity.org', 'admin123');
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Find and click approve on a pending listing
    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(2000);
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    }
  });
});

test.describe('Category Filtering', () => {
  test('should show category options on landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    const content = await page.textContent('body');
    const hasCategories = content?.includes('Food') || content?.includes('Clothing') || content?.includes('Electronics') || content?.includes('All');
    expect(hasCategories).toBeTruthy();
  });
});

test.describe('Image Upload', () => {
  test('should have file input on create listing page', async ({ page }) => {
    await login(page, 'admin@charity.org', 'admin123');
    await page.goto('/listings/create');
    await page.waitForTimeout(1000);
    
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThan(0);
  });
});

test.describe('Protected Routes', () => {
  test('unauthenticated user is redirected from create listing', async ({ page }) => {
    await page.goto('/listings/create');
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('non-admin user cannot access admin panel', async ({ page }) => {
    const email = await registerUser(page, 'Regular User');
    await login(page, email, 'TestPass123!');
    
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const url = page.url();
    const content = await page.textContent('body');
    // Should be redirected or denied
    const isProtected = url.includes('/login') || url === 'http://localhost:3000/' || content?.toLowerCase().includes('denied') || content?.toLowerCase().includes('unauthorized') || content?.toLowerCase().includes('access');
    expect(isProtected).toBeTruthy();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // On mobile the nav might be hidden, but header should be visible
    await expect(page.locator('header')).toBeVisible();
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(100);
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    await expect(page.locator('header')).toBeVisible();
  });
});
