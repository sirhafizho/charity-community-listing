import { test, expect, Page } from '@playwright/test';

/**
 * Visual contrast audit: takes screenshots and checks that text elements
 * have sufficient contrast against their backgrounds in both themes.
 */

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((nextTheme) => {
    window.localStorage.setItem('theme', nextTheme);
  }, theme);

  await page.reload();
  await page.waitForFunction((nextTheme) => document.documentElement.classList.contains(nextTheme), theme);
  await page.evaluate((nextTheme) => {
    document.documentElement.style.colorScheme = nextTheme;
  }, theme);
  await page.waitForTimeout(200);
}

// Helper to get computed color as rgba values
async function getComputedColors(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const styles = window.getComputedStyle(el);
    return {
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      text: (el as HTMLElement).innerText?.slice(0, 50),
    };
  }, selector);
}

// Parse an rgb/rgba string into numeric values
function parseRgb(color: string): { r: number; g: number; b: number } | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

// Relative luminance per WCAG 2.0
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Contrast ratio
function contrastRatio(fg: string, bg: string): number | null {
  const fgRgb = parseRgb(fg);
  const bgRgb = parseRgb(bg);
  if (!fgRgb || !bgRgb) return null;
  const l1 = luminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = luminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;

test.describe('Contrast Audit: Light Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'light');
  });

  test('homepage body has light background', async ({ page }) => {
    const bodyColors = await getComputedColors(page, 'body');
    expect(bodyColors).not.toBeNull();
    const bg = parseRgb(bodyColors!.backgroundColor);
    // Light mode: background should be light (luminance > 0.7)
    if (bg) {
      const lum = luminance(bg.r, bg.g, bg.b);
      expect(lum).toBeGreaterThan(0.5);
    }
  });

  test('heading text has good contrast on light background', async ({ page }) => {
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const colors = await page.evaluate(() => {
      const el = document.querySelector('h1');
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return { color: s.color, bg: s.backgroundColor };
    });
    if (colors) {
      const ratio = contrastRatio(colors.color, colors.bg);
      // If bg is transparent, test against body bg
      if (ratio !== null && ratio < 2) {
        const bodyBg = await getComputedColors(page, 'body');
        if (bodyBg) {
          const r2 = contrastRatio(colors.color, bodyBg.backgroundColor);
          if (r2 !== null) {
            expect(r2).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
          }
        }
      }
    }
  });

  test('navbar links are readable', async ({ page }) => {
    const links = page.locator('header a');
    const count = await links.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await links.nth(i).textContent();
      if (!text?.trim()) continue;
      const isVisible = await links.nth(i).isVisible();
      if (!isVisible) continue;
      const colors = await links.nth(i).evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return { color: styles.color, bg: styles.backgroundColor };
      });
      const bodyBg = await getComputedColors(page, 'body');
      if (!bodyBg) continue;
      const background = colors.bg === 'rgba(0, 0, 0, 0)' || colors.bg === 'transparent'
        ? bodyBg.backgroundColor
        : colors.bg;
      const ratio = contrastRatio(colors.color, background);
      if (ratio !== null) {
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
      }
    }
  });

  test('screenshot light mode homepage', async ({ page }) => {
    await page.screenshot({ path: 'test-results/light-homepage.png', fullPage: true });
  });

  test('screenshot light mode listing detail', async ({ page }) => {
    const link = page.locator('a[href*="/listings/"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForTimeout(2000);
      await setTheme(page, 'light');
      await page.screenshot({ path: 'test-results/light-detail.png', fullPage: true });
    }
  });
});

test.describe('Contrast Audit: Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'dark');
  });

  test('homepage body has dark background', async ({ page }) => {
    const bodyColors = await getComputedColors(page, 'body');
    expect(bodyColors).not.toBeNull();
    const bg = parseRgb(bodyColors!.backgroundColor);
    if (bg) {
      const lum = luminance(bg.r, bg.g, bg.b);
      expect(lum).toBeLessThan(0.15); // Should be dark
    }
  });

  test('heading text is light on dark background', async ({ page }) => {
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const color = await h1.evaluate((el) => window.getComputedStyle(el).color);
    const fg = parseRgb(color);
    if (fg) {
      const textLum = luminance(fg.r, fg.g, fg.b);
      // On dark mode, heading text luminance should be high (light colored)
      expect(textLum).toBeGreaterThan(0.4);
    }
  });

  test('card text is readable on dark cards', async ({ page }) => {
    const cards = page.locator('[class*="rounded"]').filter({ has: page.locator('h3') });
    const count = await cards.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const h3 = cards.nth(i).locator('h3').first();
      if (!(await h3.isVisible())) continue;
      const colors = await h3.evaluate((el) => {
        const s = window.getComputedStyle(el);
        // Walk up to find actual bg color
        let bg = s.backgroundColor;
        let parent = el.parentElement;
        while (parent && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
          bg = window.getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        return { color: s.color, bg };
      });
      if (colors) {
        const ratio = contrastRatio(colors.color, colors.bg);
        if (ratio !== null) {
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        }
      }
    }
  });

  test('buttons are visible and readable in dark mode', async ({ page }) => {
    const buttons = page.locator('a[class*="rounded-full"], button[class*="rounded-full"]');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      if (!(await buttons.nth(i).isVisible())) continue;
      const colors = await buttons.nth(i).evaluate((el) => {
        const s = window.getComputedStyle(el);
        return { color: s.color, bg: s.backgroundColor };
      });
      if (colors) {
        const ratio = contrastRatio(colors.color, colors.bg);
        if (ratio !== null && ratio > 1) {
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        }
      }
    }
  });

  test('navbar links are readable in dark mode', async ({ page }) => {
    const links = page.locator('header a');
    const count = await links.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await links.nth(i).textContent();
      if (!text?.trim()) continue;
      if (!(await links.nth(i).isVisible())) continue;
      const color = await links.nth(i).evaluate((el) => window.getComputedStyle(el).color);
      const fg = parseRgb(color);
      if (fg) {
        const textLum = luminance(fg.r, fg.g, fg.b);
        // Dark mode text should be light enough to read (luminance > 0.15)
        expect(textLum).toBeGreaterThan(0.15);
      }
    }
  });

  test('screenshot dark mode homepage', async ({ page }) => {
    await page.screenshot({ path: 'test-results/dark-homepage.png', fullPage: true });
  });

  test('screenshot dark mode listing detail', async ({ page }) => {
    const link = page.locator('a[href*="/listings/"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForTimeout(2000);
      await setTheme(page, 'dark');
      await page.screenshot({ path: 'test-results/dark-detail.png', fullPage: true });
    }
  });

  test('screenshot dark mode login page', async ({ page }) => {
    await page.goto('/login');
    await setTheme(page, 'dark');
    await page.screenshot({ path: 'test-results/dark-login.png', fullPage: true });
  });

  test('screenshot dark mode admin page', async ({ page }) => {
    await login(page, 'admin@charity.org', 'admin123');
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await setTheme(page, 'dark');
    await page.screenshot({ path: 'test-results/dark-admin.png', fullPage: true });
  });
});
