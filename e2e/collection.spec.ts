/**
 * End-to-end tests for the fragrance collection browser.
 *
 * Covers: search, quick views, sort, filter panel, brand autocomplete,
 * sticky header scroll behaviour, URL persistence, browser history,
 * ARIA attributes, and mobile viewport.
 *
 * Required env vars (copy e2e/.env.example to .env.local and fill in):
 *   TEST_USER  – GitHub "owner/repo" used to authenticate
 *   TEST_PASS  – GitHub personal access token (read-only)
 */

import { test, expect, type Page, type Browser } from '@playwright/test';

// ---------------------------------------------------------------------------
// Credentials – fail fast with a clear message when not configured
// ---------------------------------------------------------------------------
const TEST_USER = process.env.TEST_USER;
const TEST_PASS = process.env.TEST_PASS;

if (!TEST_USER || !TEST_PASS) {
  throw new Error(
    'Missing credentials. Copy e2e/.env.example to .env.local and set TEST_USER and TEST_PASS.',
  );
}

// ---------------------------------------------------------------------------
// Shared page – tests run serially so state carries over between them
// ---------------------------------------------------------------------------
test.describe.configure({ mode: 'serial' });

let browser: Browser;
let page: Page;

test.beforeAll(async ({ playwright }) => {
  browser = await playwright.chromium.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // Log in once for all tests
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="text"]').first().fill(TEST_USER!);
  await page.locator('input[type="password"]').fill(TEST_PASS!);
  await page.locator('button:has-text("Log In")').click();
  await page.waitForSelector('input[role="searchbox"]', { timeout: 15000 });
  await page.waitForTimeout(1500);
});

test.afterAll(async () => {
  await page.close();
  await browser.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sortBtn() { return page.locator('button[aria-haspopup="listbox"]').first(); }
function filterBtn() { return page.locator('button[aria-label="Filter"], button[aria-label*="Filter,"]').first(); }
function quickView(label: string) { return page.locator(`[role="group"][aria-label="Schnellfilter"] button:has-text("${label}")`); }
function resultCount() { return page.locator('text=/von.*Düften/').first(); }
function filterDialog() { return page.locator('[role="dialog"][aria-label="Filter"]').filter({ visible: true }); }

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

test('search by brand/name filters the result list', async () => {
  await page.locator('input[role="searchbox"]').fill('Tom Ford');
  await page.waitForTimeout(300);
  const count = await resultCount().textContent();
  expect.soft(parseInt(count!), 'results reduced').toBeLessThan(100);
  expect.soft(page.url(), 'q= in URL').toContain('q=');
});

test('search is case-insensitive', async () => {
  const upper = await resultCount().textContent();
  await page.locator('input[role="searchbox"]').fill('tom ford');
  await page.waitForTimeout(300);
  expect.soft(await resultCount().textContent(), 'same count regardless of case').toBe(upper);
});

test('clearing search restores all 366 fragrances', async () => {
  await page.locator('input[role="searchbox"]').fill('');
  await page.waitForTimeout(300);
  expect.soft(await resultCount().textContent()).toBe('366 von 366 Düften');
});

// ---------------------------------------------------------------------------
// Quick views
// ---------------------------------------------------------------------------

test('quick view "Am besten bewertet" filters and sets aria-pressed', async () => {
  await quickView('Am besten bewertet').click();
  await page.waitForTimeout(300);
  expect.soft(await quickView('Am besten bewertet').getAttribute('aria-pressed'), 'aria-pressed=true').toBe('true');
  expect.soft(parseInt((await resultCount().textContent())!), 'result count reduced').toBeLessThan(366);

  // Clicking again deactivates it
  await quickView('Am besten bewertet').click();
  await page.waitForTimeout(200);
  expect.soft(await quickView('Am besten bewertet').getAttribute('aria-pressed'), 'aria-pressed=false').toBe('false');
});

test('quick view "Im Besitz" shows only owned fragrances', async () => {
  await quickView('Im Besitz').click();
  await page.waitForTimeout(300);
  expect.soft(parseInt((await resultCount().textContent())!), 'result count reduced').toBeLessThan(366);
  await quickView('Im Besitz').click();
  await page.waitForTimeout(200);
});

test('quick view "Getestet" shows only tested fragrances', async () => {
  await quickView('Getestet').click();
  await page.waitForTimeout(300);
  expect.soft(parseInt((await resultCount().textContent())!), 'result count reduced').toBeLessThan(366);
  await quickView('Getestet').click();
  await page.waitForTimeout(200);
});

test('"Alle" quick view clears all active quick views and resets results', async () => {
  // Activate multiple quick views first
  await quickView('Am besten bewertet').click();
  await page.waitForTimeout(200);
  await quickView('Im Besitz').click();
  await page.waitForTimeout(200);

  await quickView('Alle').click();
  await page.waitForTimeout(200);

  expect.soft(await resultCount().textContent(), 'all results restored').toBe('366 von 366 Düften');
  expect.soft(await quickView('Alle').getAttribute('aria-pressed'), '"Alle" is pressed').toBe('true');
});

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

test('sort menu opens with correct ARIA and 6 options', async () => {
  await sortBtn().click();
  await page.waitForTimeout(200);

  expect.soft(await page.locator('[role="listbox"]').first().isVisible(), 'listbox visible').toBe(true);
  expect.soft(await sortBtn().getAttribute('aria-expanded'), 'aria-expanded=true').toBe('true');
  expect.soft(await page.locator('[role="listbox"] button[role="option"]').count(), '6 sort options').toBe(6);
});

test('selecting a sort option updates the URL', async () => {
  await page.locator('[role="listbox"] button[role="option"]:has-text("Marke A–Z")').click();
  await page.waitForTimeout(300);
  expect.soft(page.url(), 'brandAsc in URL').toContain('brandAsc');

  // Reset sort
  await sortBtn().click();
  await page.waitForTimeout(200);
  await page.locator('[role="listbox"] button[role="option"]:has-text("Neu hinzugefügt")').click();
  await page.waitForTimeout(200);
});

// ---------------------------------------------------------------------------
// Filter panel
// ---------------------------------------------------------------------------

test('filter panel opens with correct ARIA attributes', async () => {
  await filterBtn().click();
  await page.waitForTimeout(400);

  expect.soft(await filterDialog().isVisible(), 'dialog visible').toBe(true);
  expect.soft(await filterDialog().getAttribute('aria-modal'), 'aria-modal=true').toBe('true');
  expect.soft(await filterDialog().getAttribute('role'), 'role=dialog').toBe('dialog');
});

test('filter option buttons show dynamic counts in parentheses', async () => {
  const typeChipText = await filterDialog()
    .locator('[role="group"][aria-label="Typ auswählen"] button')
    .filter({ hasText: /\(\d+\)/ })
    .first()
    .textContent();
  expect.soft(typeChipText, 'type chip has count badge').toMatch(/\(\d+\)/);

  const seasonBtnText = await filterDialog()
    .locator('[role="group"][aria-label="Jahreszeit auswählen"] button')
    .filter({ hasText: /\(\d+\)/ })
    .first()
    .textContent();
  expect.soft(seasonBtnText, 'season button has count badge').toMatch(/\(\d+\)/);

  const ratingBtnText = await filterDialog()
    .locator('[role="group"][aria-label="Bewertung"] button')
    .filter({ hasText: /\(\d+\)/ })
    .first()
    .textContent();
  expect.soft(ratingBtnText, 'rating button has count badge').toMatch(/\(\d+\)/);
});

test('rating filter reduces results and reflects in URL', async () => {
  await filterDialog().locator('button:has-text("7,5+")').click();
  await page.waitForTimeout(300);

  expect.soft(parseInt((await resultCount().textContent())!), 'results reduced').toBeLessThan(366);
  expect.soft(page.url(), 'mr=75 in URL').toContain('mr=75');
});

test('pressing Escape closes the filter panel', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const visible = await page.locator('[role="dialog"][aria-label="Filter"]')
    .filter({ visible: true }).isVisible().catch(() => false);
  expect.soft(visible, 'dialog closed').toBe(false);
});

test('selecting a rating filter auto-activates the "Am besten bewertet" quick view', async () => {
  // mr=75 was set in the previous test and persisted
  expect.soft(
    await quickView('Am besten bewertet').getAttribute('aria-pressed'),
    '"Am besten bewertet" auto-active',
  ).toBe('true');
});

test('selecting "Unbewertet" clears the minimum-rating filter (conflict resolution)', async () => {
  await filterBtn().click();
  await page.waitForTimeout(400);
  await filterDialog().locator('button:has-text("Unbewertet")').click();
  await page.waitForTimeout(300);

  expect.soft(page.url(), 'mr= removed from URL').not.toContain('mr=');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  expect.soft(
    await quickView('Am besten bewertet').getAttribute('aria-pressed'),
    '"Am besten bewertet" deactivated',
  ).toBe('false');
});

test('"Alle löschen" restores all 366 fragrances', async () => {
  const clearBtn = page.locator('button:has-text("Alle löschen"), button:has-text("Alle Filter löschen")').first();
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(200);
  }
  expect.soft(await resultCount().textContent()).toBe('366 von 366 Düften');
});

// ---------------------------------------------------------------------------
// Brand autocomplete
// ---------------------------------------------------------------------------

test('brand autocomplete shows suggestions and filters on selection', async () => {
  await filterBtn().click();
  await page.waitForTimeout(400);

  await filterDialog().locator('[role="combobox"]').first().fill('Tom');
  await page.waitForTimeout(300);

  expect.soft(
    await page.locator('[role="listbox"]').filter({ visible: true }).count() > 0,
    'suggestions shown',
  ).toBe(true);

  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  expect.soft(page.url(), 'brand= in URL').toContain('brand=');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Clear for subsequent tests
  const clearBtn = page.locator('button:has-text("Alle löschen"), button:has-text("Alle Filter löschen")').first();
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(200);
  }
});

// ---------------------------------------------------------------------------
// Add fragrance modal
// ---------------------------------------------------------------------------

test('"Duft hinzufügen" opens a modal that closes on Escape', async () => {
  await page.locator('button:has-text("Duft hinzufügen")').click();
  await page.waitForTimeout(300);

  expect.soft(
    await page.locator('[role="dialog"][aria-label="Duft hinzufügen"]').isVisible(),
    'modal opens',
  ).toBe(true);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  expect.soft(
    await page.locator('[role="dialog"][aria-label="Duft hinzufügen"]').isVisible().catch(() => false),
    'modal closes',
  ).toBe(false);
});

// ---------------------------------------------------------------------------
// Sticky header – scroll behaviour
// ---------------------------------------------------------------------------

test('scrolling down collapses the collection header and shows the sticky header', async () => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);

  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 600);

  // Sticky header renders "Suche öffnen" button; use DOM check to avoid
  // isVisible() quirks with position:sticky during animation
  const stickyBtnVisible = await page.waitForFunction(
    () => {
      const btn = document.querySelector<HTMLElement>('button[aria-label="Suche öffnen"]');
      if (!btn) return false;
      const r = btn.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    },
    { timeout: 4000 },
  ).then(() => true).catch(() => false);

  expect.soft(stickyBtnVisible, 'sticky search button visible').toBe(true);

  const collectionHidden = await page.waitForFunction(
    () => !document.querySelector('[role="group"][aria-label="Schnellfilter"]'),
    { timeout: 3000 },
  ).then(() => true).catch(() => false);

  expect.soft(collectionHidden, 'collection header unmounted').toBe(true);
});

test('scrolling back up restores the collection header', async () => {
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(800);

  expect.soft(
    await page.locator('[role="group"][aria-label="Schnellfilter"]').isVisible(),
    'quick views visible again',
  ).toBe(true);
});

// ---------------------------------------------------------------------------
// URL persistence and browser history
// ---------------------------------------------------------------------------

test('active filters are reflected in the URL and survive a page reload via back/forward', async () => {
  await page.locator('input[role="searchbox"]').fill('Oud');
  await page.waitForTimeout(300);
  await quickView('Am besten bewertet').click();
  await page.waitForTimeout(300);

  expect.soft(page.url(), 'q= and mr= in URL').toMatch(/q=Oud.*mr=|mr=.*q=Oud/);

  await page.goBack();
  await page.waitForTimeout(300);

  expect.soft(page.url(), 'mr= removed after back').not.toContain('mr=');
});

// ---------------------------------------------------------------------------
// ARIA audit
// ---------------------------------------------------------------------------

test('all key ARIA attributes are present on interactive controls', async () => {
  // Navigate to a clean state for the audit
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[role="searchbox"]', { timeout: 5000 }).catch(() => {});

  expect.soft(
    await page.locator('input[role="searchbox"]').getAttribute('aria-label'),
    'searchbox aria-label',
  ).toBe('Marke oder Duftname suchen');

  expect.soft(
    await page.locator('[role="group"][aria-label="Schnellfilter"]').count(),
    'quick views role=group',
  ).toBe(1);

  expect.soft(
    await page.locator('[role="group"][aria-label="Schnellfilter"] [aria-pressed]').count(),
    '4 aria-pressed buttons',
  ).toBe(4);

  expect.soft(
    await page.locator('button[aria-haspopup="listbox"]').count() >= 1,
    'sort button aria-haspopup=listbox',
  ).toBe(true);

  expect.soft(
    await page.locator('[aria-live="polite"]').count() > 0,
    'aria-live polite region for result count',
  ).toBe(true);

  // Filter panel ARIA
  await filterBtn().click();
  await page.waitForTimeout(400);

  expect.soft(
    await page.locator('[role="combobox"][aria-autocomplete="list"]').count(),
    'brand input role=combobox aria-autocomplete=list',
  ).toBeGreaterThanOrEqual(1);

  expect.soft(
    !!(await page.locator('[role="combobox"]').first().getAttribute('aria-controls')),
    'combobox aria-controls set',
  ).toBe(true);

  expect.soft(await filterDialog().getAttribute('aria-modal'), 'filter dialog aria-modal=true').toBe('true');
  expect.soft(await filterDialog().getAttribute('role'), 'filter dialog role=dialog').toBe('dialog');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
});

// ---------------------------------------------------------------------------
// Mobile viewport
// ---------------------------------------------------------------------------

test('mobile viewport shows abbreviated quick-view labels and opens the filter sheet', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[role="searchbox"]', { timeout: 15000 });
  await page.waitForTimeout(1500);

  expect.soft(
    await page.locator('[role="group"][aria-label="Schnellfilter"] .sm\\:hidden').count() > 0,
    'short labels rendered on mobile (sm:hidden elements present)',
  ).toBe(true);

  await page.locator('button[aria-label="Filter"], button[aria-label*="Filter,"]').first().click();
  await page.waitForTimeout(400);

  expect.soft(await filterDialog().isVisible(), 'filter sheet opens on mobile').toBe(true);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
});
