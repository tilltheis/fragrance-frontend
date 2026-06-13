import { expect, test, type Locator, type Page } from '@playwright/test';

const OWNER = 'test-owner';
const REPO = 'test-repo';
const BASE_PATH = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

const STATIC_RECORDS = [
  {
    id: 1,
    brand: 'Creed',
    name: 'Erolfa',
    concentration: 'Eau de Parfum',
    scent: { 70: 8 },
    longevity: { 60: 8 },
    sillage: { 50: 8 },
    season: { Frühling: 4, Sommer: 6, Herbst: 2, Winter: 1 },
    occasion: { Täglich: 4, Freizeit: 5, Abend: 2 },
    type: { Frisch: 5, Aquatisch: 4, Zitrus: 3 },
    structure: 'pyramid',
    head: ['Bergamotte', 'Zitrone'],
    heart: ['Ingwer', 'Jasmin'],
    base: ['Moschus', 'Amber'],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    brand: 'Dior',
    name: 'Sauvage',
    concentration: 'Eau de Toilette',
    scent: { 80: 8 },
    longevity: { 70: 8 },
    sillage: { 80: 8 },
    season: { Sommer: 4, Herbst: 4, Winter: 4 },
    occasion: { Arbeit: 3, Ausgehen: 5, Abend: 4 },
    type: { Würzig: 5, Holzig: 4, Frisch: 2 },
    structure: 'pyramid',
    head: ['Bergamotte'],
    heart: ['Lavendel'],
    base: ['Ambroxan'],
    createdAt: '2025-01-02T00:00:00.000Z',
  },
] as const;

const BASE_DYNAMIC_RECORDS = [
  {
    id: 1,
    brandQuery: 'creed',
    nameQuery: 'erolfa',
    owned: true,
    rating: 0.5,
    reason: 'Frisch und salzig',
    comment: 'Sommerliebling',
    sellers: ['Douglas'],
  },
  {
    id: 2,
    brandQuery: 'dior',
    nameQuery: 'sauvage',
    owned: false,
    rating: 0.7,
    reason: 'Laut',
    comment: 'Klassiker',
    sellers: ['Sephora'],
  },
] as const;

function encodeJsonl(records: ReadonlyArray<Record<string, unknown>>) {
  return Buffer.from(records.map((record) => JSON.stringify(record)).join('\n'), 'utf8').toString('base64');
}

function contentResponse(records: ReadonlyArray<Record<string, unknown>>, sha: string) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      type: 'file',
      encoding: 'base64',
      sha,
      content: encodeJsonl(records),
    }),
  };
}

async function installGithubMocks(page: Page) {
  let dynamicRecords = BASE_DYNAMIC_RECORDS.map((record) => ({ ...record }));
  let dynamicSha = 1;
  const putBodies: Record<string, unknown>[] = [];

  await page.route(`${BASE_PATH}/*`, async (route) => {
    const request = route.request();
    const path = decodeURIComponent(new URL(request.url()).pathname.split('/contents/')[1] ?? '');

    if (request.method() === 'GET' && path === 'README.md') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'file',
          encoding: 'base64',
          sha: 'readme-sha',
          content: Buffer.from('# Test repo', 'utf8').toString('base64'),
        }),
      });
      return;
    }

    if (request.method() === 'GET' && path === 'static-fragrance-data.jsonl') {
      await route.fulfill(contentResponse([...STATIC_RECORDS], 'static-sha'));
      return;
    }

    if (request.method() === 'GET' && path === 'dynamic-fragrance-data.jsonl') {
      await route.fulfill(contentResponse(dynamicRecords, `dynamic-sha-${dynamicSha}`));
      return;
    }

    if (request.method() === 'PUT' && path === 'dynamic-fragrance-data.jsonl') {
      const body = JSON.parse(request.postData() ?? '{}') as Record<string, string>;
      putBodies.push(body);
      dynamicRecords = Buffer.from(body.content ?? '', 'base64')
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      dynamicSha += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: { sha: `dynamic-sha-${dynamicSha}` },
        }),
      });
      return;
    }

    await route.abort();
  });

  return {
    getPutBodies: () => putBodies,
  };
}

async function login(page: Page, query = '') {
  await page.goto(`/${query}`);
  await page.getByLabel('Username').fill(`${OWNER}/${REPO}`);
  await page.getByLabel('Password').fill('test-token');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('searchbox', { name: 'Marke oder Duftname suchen' })).toBeVisible();
}

function resultCount(page: Page) {
  return page.locator('[data-testid="result-count"]').filter({ visible: true }).first();
}

function quickView(page: Page, label: string) {
  return page.locator('[role="group"][aria-label="Schnellfilter"]').getByRole('button', { name: label });
}

function card(page: Page, name: RegExp | string) {
  return page.getByRole('button', { name });
}

function detailPanel(page: Page) {
  return page.getByTestId('fragrance-detail');
}

function ownershipRadio(page: Page, label: 'Nicht im Besitz' | 'Im Besitz') {
  return detailPanel(page).getByRole('radio', { name: label, exact: true });
}

function ownershipLabel(page: Page, fragranceId: number, owned: boolean) {
  return detailPanel(page).locator(`label[for="ownership-${fragranceId}-${owned ? 'owned' : 'not-owned'}"]`);
}

async function clickTopRightOfCard(cardLocator: Locator, page: Page) {
  const box = await cardLocator.boundingBox();
  if (!box) throw new Error('Card is not visible');
  await page.mouse.click(box.x + box.width - 10, box.y + 10);
}

test.describe('ownership UI', () => {
  test('owned cards show the bottle icon and icon clicks behave like card clicks', async ({ page }) => {
    await installGithubMocks(page);
    await login(page);

    const ownedCard = card(page, /Creed Erolfa, im Besitz/);
    const unownedCard = card(page, /^Dior Sauvage$/);

    await expect(ownedCard.locator('[data-ownership-indicator="true"]')).toHaveCount(1);
    await expect(unownedCard.locator('[data-ownership-indicator="true"]')).toHaveCount(0);
    await expect(ownedCard.locator('[data-ownership-indicator="true"]')).toHaveAttribute('aria-hidden', 'true');

    await clickTopRightOfCard(ownedCard, page);
    await expect(page.getByRole('button', { name: 'Detailansicht schließen' })).toBeVisible();
    await expect(ownershipRadio(page, 'Im Besitz')).toBeChecked();
  });

  test('ownership selector exposes radio semantics and keyboard interaction', async ({ page }) => {
    await installGithubMocks(page);
    await login(page);

    await card(page, /Creed Erolfa, im Besitz/).press('Enter');

    const notOwnedRadio = ownershipRadio(page, 'Nicht im Besitz');
    const ownedRadio = ownershipRadio(page, 'Im Besitz');
    const ownershipLegend = detailPanel(page).locator('legend', { hasText: 'Besitz' });

    await expect(ownershipLegend).toBeVisible();
    await expect(ownedRadio).toBeChecked();

    await ownedRadio.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(notOwnedRadio).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(ownedRadio).toBeChecked();
  });

  test('ownership changes update optimistically and only save when the value changes', async ({ page }) => {
    const github = await installGithubMocks(page);
    await login(page);

    await card(page, /^Dior Sauvage$/).click();

    const notOwnedRadio = ownershipRadio(page, 'Nicht im Besitz');
    const ownedRadio = ownershipRadio(page, 'Im Besitz');

    await expect(notOwnedRadio).toBeChecked();
    await ownershipLabel(page, 2, false).click();
    await page.waitForTimeout(3200);
    await expect(github.getPutBodies()).toHaveLength(0);

    await ownershipLabel(page, 2, true).click();
    await expect(ownedRadio).toBeChecked();
    await expect(detailPanel(page).locator('[data-ownership-indicator="true"]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Detailansicht schließen' }).click();
    await expect(card(page, /Dior Sauvage, im Besitz/).locator('[data-ownership-indicator="true"]')).toHaveCount(1);

    await page.waitForTimeout(3200);
    await expect(github.getPutBodies()).toHaveLength(1);
  });

  test('owned filter keeps an expanded card visible until collapse', async ({ page }) => {
    await installGithubMocks(page);
    await login(page);

    await quickView(page, 'Im Besitz').click();
    await expect(resultCount(page)).toHaveText('1 von 2 Düften');

    await card(page, /Creed Erolfa, im Besitz/).click();
    await ownershipLabel(page, 1, false).click();

    await expect(detailPanel(page).locator('[data-ownership-indicator="true"]')).toHaveCount(0);
    await expect(resultCount(page)).toHaveText('1 von 2 Düften');
    await expect(ownershipRadio(page, 'Nicht im Besitz')).toBeChecked();

    await page.getByRole('button', { name: 'Detailansicht schließen' }).click();
    await expect(resultCount(page)).toHaveText('0 von 2 Düften');
    await expect(card(page, /Creed Erolfa/)).toHaveCount(0);
  });

  test('not-owned filter keeps an expanded card visible until collapse', async ({ page }) => {
    await installGithubMocks(page);
    await login(page, '?own=notOwned');

    await expect(resultCount(page)).toHaveText('1 von 2 Düften');

    await card(page, /^Dior Sauvage$/).click();
    await ownershipLabel(page, 2, true).click();

    await expect(detailPanel(page).locator('[data-ownership-indicator="true"]')).toHaveCount(1);
    await expect(resultCount(page)).toHaveText('1 von 2 Düften');

    await page.getByRole('button', { name: 'Detailansicht schließen' }).click();
    await expect(resultCount(page)).toHaveText('0 von 2 Düften');
    await expect(card(page, /Dior Sauvage/)).toHaveCount(0);
  });

  test('desktop and mobile detail ordering stay correct', async ({ page }) => {
    await installGithubMocks(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await login(page);
    await card(page, /Creed Erolfa, im Besitz/).click();

    const desktopCommunity = detailPanel(page).getByText('Community-Wertung').first();
    const desktopOwnership = detailPanel(page).locator('legend', { hasText: 'Besitz' }).first();
    const desktopRating = detailPanel(page).getByText('Persönliche Wertung').first();

    const desktopCommunityBox = await desktopCommunity.boundingBox();
    const desktopOwnershipBox = await desktopOwnership.boundingBox();
    const desktopRatingBox = await desktopRating.boundingBox();

    expect(desktopCommunityBox).not.toBeNull();
    expect(desktopOwnershipBox).not.toBeNull();
    expect(desktopRatingBox).not.toBeNull();

    expect(desktopOwnershipBox!.x).toBeGreaterThan(desktopCommunityBox!.x);
    expect(desktopOwnershipBox!.y).toBeLessThan(desktopRatingBox!.y);

    await page.getByRole('button', { name: 'Detailansicht schließen' }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await card(page, /Creed Erolfa, im Besitz/).click();

    const mobileCommunity = detailPanel(page).getByText('Community-Wertung').first();
    const mobileOwnership = detailPanel(page).locator('legend', { hasText: 'Besitz' }).first();
    const mobileRating = detailPanel(page).getByText('Persönliche Wertung').first();

    const mobileCommunityBox = await mobileCommunity.boundingBox();
    const mobileOwnershipBox = await mobileOwnership.boundingBox();
    const mobileRatingBox = await mobileRating.boundingBox();

    expect(mobileCommunityBox).not.toBeNull();
    expect(mobileOwnershipBox).not.toBeNull();
    expect(mobileRatingBox).not.toBeNull();

    expect(mobileOwnershipBox!.y).toBeGreaterThan(mobileCommunityBox!.y);
    expect(mobileOwnershipBox!.y).toBeLessThan(mobileRatingBox!.y);
  });
});
