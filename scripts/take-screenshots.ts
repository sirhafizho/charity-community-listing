import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("📸 Taking screenshots...\n");

  // 1. Homepage
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/screenshots/homepage.png", fullPage: false });
  console.log("✓ Homepage");

  // 2. Homepage - Dark Mode
  const themeBtn = page.locator('button[aria-label*="Switch theme"]');
  if (await themeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await themeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "docs/screenshots/homepage-dark.png", fullPage: false });
    console.log("✓ Homepage (Dark Mode)");
    // Switch back
    await themeBtn.click();
    await page.waitForTimeout(300);
  }

  // 3. Login page
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/screenshots/login.png", fullPage: false });
  console.log("✓ Login Page");

  // 4. Register page
  await page.goto(`${BASE_URL}/register`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/screenshots/register.png", fullPage: false });
  console.log("✓ Register Page");

  // Login as admin
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Email").fill("admin@charity.org");
  await page.getByPlaceholder("Enter your password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // 5. Admin Panel
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "docs/screenshots/admin-panel.png", fullPage: false });
  console.log("✓ Admin Panel");

  // 6. Create Listing page
  await page.goto(`${BASE_URL}/listings/create`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/screenshots/create-listing.png", fullPage: false });
  console.log("✓ Create Listing Page");

  // 7. Listing Detail (find one from the homepage)
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  const listingLink = page.locator('a[href*="/listings/"]').first();
  if (await listingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await listingLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "docs/screenshots/listing-detail.png", fullPage: false });
    console.log("✓ Listing Detail");
  }

  // 8. Dashboard
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "docs/screenshots/dashboard.png", fullPage: false });
  console.log("✓ Dashboard");

  // 9. Mobile view of homepage
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/screenshots/mobile-homepage.png", fullPage: false });
  console.log("✓ Mobile Homepage");

  // 10. Mobile dark mode
  const mobileThemeBtn = page.locator('button[aria-label*="Switch theme"]');
  if (await mobileThemeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mobileThemeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "docs/screenshots/mobile-dark.png", fullPage: false });
    console.log("✓ Mobile Dark Mode");
  }

  await browser.close();
  console.log("\n🎉 All screenshots saved to docs/screenshots/");
}

main().catch(console.error);
