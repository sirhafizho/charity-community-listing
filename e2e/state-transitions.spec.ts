import { test, expect, type Page } from '@playwright/test';

test.setTimeout(90_000);

const ADMIN = { email: 'admin@charity.org', password: 'admin123' };
const DONOR = { email: 'demo@charity.org', password: 'donor123' };
const MEMBER = { email: 'member@charity.org', password: 'community123' };

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

async function logout(page: Page) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

async function loginAs(page: Page, email: string, password: string) {
  await logout(page);
  await login(page, email, password);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function apiCreateListing(page: Page, title: string) {
  const catResp = await page.request.get('/api/categories');
  const cats = await catResp.json();
  const categoryId = cats.data[0].id;

  const createResp = await page.request.post('/api/listings', {
    data: {
      title,
      description: 'Edge case test listing',
      location: 'Test City',
      categoryId,
      condition: 'GOOD',
      tags: [],
    },
  });
  const body = await createResp.json();
  if (!body.data) {
    throw new Error(`Failed to create listing: ${JSON.stringify(body)}`);
  }
  return body.data;
}

async function adminApproveListing(page: Page, listingId: string) {
  const resp = await page.request.put(`/api/admin/listings/${listingId}`, {
    data: { status: 'APPROVED' },
  });
  return resp;
}

async function apiClaim(page: Page, listingId: string, message: string) {
  const resp = await page.request.post('/api/claims', {
    data: { listingId, message },
  });
  const body = await resp.json();
  return body.data;
}

async function apiUpdateClaim(page: Page, claimId: string, status: string) {
  const resp = await page.request.put(`/api/claims/${claimId}`, {
    data: { status },
  });
  return resp;
}

test.describe('State Transition Edge Cases', () => {
  test('admin cannot approve a CLAIMED listing back to APPROVED', async ({ page }) => {
    // Donor creates listing
    await login(page, DONOR.email, DONOR.password);
    const listing = await apiCreateListing(page, uid('edge-claimed'));

    // Admin approves listing
    await loginAs(page, ADMIN.email, ADMIN.password);
    await adminApproveListing(page, listing.id);

    // Member claims it
    await loginAs(page, MEMBER.email, MEMBER.password);
    const claim = await apiClaim(page, listing.id, 'I need this!');

    // Donor approves the claim → listing becomes CLAIMED
    await loginAs(page, DONOR.email, DONOR.password);
    const approveResp = await apiUpdateClaim(page, claim.id, 'APPROVED');
    expect(approveResp.ok()).toBe(true);

    // Admin tries to set listing back to APPROVED — should be blocked
    await loginAs(page, ADMIN.email, ADMIN.password);
    const badResp = await page.request.put(`/api/admin/listings/${listing.id}`, {
      data: { status: 'APPROVED' },
    });
    expect(badResp.status()).toBe(409);
    const body = await badResp.json();
    expect(body.error).toContain('claim lifecycle');
  });

  test('admin cannot approve a FULFILLED listing', async ({ page }) => {
    await login(page, DONOR.email, DONOR.password);
    const listing = await apiCreateListing(page, uid('edge-fulfilled'));

    await loginAs(page, ADMIN.email, ADMIN.password);
    await adminApproveListing(page, listing.id);

    await loginAs(page, MEMBER.email, MEMBER.password);
    const claim = await apiClaim(page, listing.id, 'Need it');

    await loginAs(page, DONOR.email, DONOR.password);
    await apiUpdateClaim(page, claim.id, 'APPROVED');
    await apiUpdateClaim(page, claim.id, 'FULFILLED');

    // Admin tries to change FULFILLED listing — blocked
    await loginAs(page, ADMIN.email, ADMIN.password);
    const resp = await page.request.put(`/api/admin/listings/${listing.id}`, {
      data: { status: 'APPROVED' },
    });
    expect(resp.status()).toBe(409);
  });

  test('cannot approve a claim when another is already approved', async ({ page }) => {
    await login(page, DONOR.email, DONOR.password);
    const listing = await apiCreateListing(page, uid('edge-double-approve'));

    await loginAs(page, ADMIN.email, ADMIN.password);
    await adminApproveListing(page, listing.id);

    // Two members claim the same listing (simulate with same member since unique constraint)
    await loginAs(page, MEMBER.email, MEMBER.password);
    const claim1 = await apiClaim(page, listing.id, 'First claim');

    // Donor approves claim1
    await loginAs(page, DONOR.email, DONOR.password);
    const resp1 = await apiUpdateClaim(page, claim1.id, 'APPROVED');
    expect(resp1.ok()).toBe(true);

    // Try to approve the same claim again — should fail (already approved → no valid transition)
    const resp2 = await apiUpdateClaim(page, claim1.id, 'APPROVED');
    expect(resp2.status()).toBe(409);
  });

  test('cannot fulfill a PENDING claim directly', async ({ page }) => {
    await login(page, DONOR.email, DONOR.password);
    const listing = await apiCreateListing(page, uid('edge-skip-approve'));

    await loginAs(page, ADMIN.email, ADMIN.password);
    await adminApproveListing(page, listing.id);

    await loginAs(page, MEMBER.email, MEMBER.password);
    const claim = await apiClaim(page, listing.id, 'Claim it');

    // Donor tries to fulfill without approving first — blocked
    await loginAs(page, DONOR.email, DONOR.password);
    const resp = await apiUpdateClaim(page, claim.id, 'FULFILLED');
    expect(resp.status()).toBe(409);
    const body = await resp.json();
    expect(body.error).toContain('PENDING');
  });

  test('cannot change a FULFILLED claim', async ({ page }) => {
    await login(page, DONOR.email, DONOR.password);
    const listing = await apiCreateListing(page, uid('edge-terminal'));

    await loginAs(page, ADMIN.email, ADMIN.password);
    await adminApproveListing(page, listing.id);

    await loginAs(page, MEMBER.email, MEMBER.password);
    const claim = await apiClaim(page, listing.id, 'Need this');

    await loginAs(page, DONOR.email, DONOR.password);
    await apiUpdateClaim(page, claim.id, 'APPROVED');
    await apiUpdateClaim(page, claim.id, 'FULFILLED');

    // Try to change fulfilled claim — blocked
    const resp1 = await apiUpdateClaim(page, claim.id, 'REJECTED');
    expect(resp1.status()).toBe(409);
    const body = await resp1.json();
    expect(body.error).toContain('fulfilled');

    const resp2 = await apiUpdateClaim(page, claim.id, 'APPROVED');
    expect(resp2.status()).toBe(409);
  });

  test('cannot change a REJECTED claim', async ({ page }) => {
    await login(page, DONOR.email, DONOR.password);
    const listing = await apiCreateListing(page, uid('edge-rejected'));

    await loginAs(page, ADMIN.email, ADMIN.password);
    await adminApproveListing(page, listing.id);

    await loginAs(page, MEMBER.email, MEMBER.password);
    const claim = await apiClaim(page, listing.id, 'Want it');

    await loginAs(page, DONOR.email, DONOR.password);
    await apiUpdateClaim(page, claim.id, 'REJECTED');

    // Try to approve after rejection — blocked
    const resp = await apiUpdateClaim(page, claim.id, 'APPROVED');
    expect(resp.status()).toBe(409);
    const body = await resp.json();
    expect(body.error).toContain('rejected');
  });

  test('admin can re-approve a REJECTED listing', async ({ page }) => {
    await login(page, DONOR.email, DONOR.password);
    const listing = await apiCreateListing(page, uid('edge-reapprove'));

    // Admin rejects then re-approves
    await loginAs(page, ADMIN.email, ADMIN.password);
    await adminApproveListing(page, listing.id);
    const rejectResp = await page.request.put(`/api/admin/listings/${listing.id}`, {
      data: { status: 'REJECTED' },
    });
    expect(rejectResp.ok()).toBe(true);

    const reApproveResp = await page.request.put(`/api/admin/listings/${listing.id}`, {
      data: { status: 'APPROVED' },
    });
    expect(reApproveResp.ok()).toBe(true);
  });

  test('rejecting the only approved claim reverts listing to APPROVED', async ({ page }) => {
    await login(page, DONOR.email, DONOR.password);
    const listing = await apiCreateListing(page, uid('edge-revert'));

    await loginAs(page, ADMIN.email, ADMIN.password);
    await adminApproveListing(page, listing.id);

    await loginAs(page, MEMBER.email, MEMBER.password);
    const claim = await apiClaim(page, listing.id, 'Claim me');

    // Donor approves then rejects
    await loginAs(page, DONOR.email, DONOR.password);
    await apiUpdateClaim(page, claim.id, 'APPROVED');
    const rejectResp = await apiUpdateClaim(page, claim.id, 'REJECTED');
    expect(rejectResp.ok()).toBe(true);

    // Verify listing is back to APPROVED
    const listingResp = await page.request.get(`/api/listings/${listing.id}`);
    const listingData = await listingResp.json();
    expect(listingData.data.status).toBe('APPROVED');
  });
});
