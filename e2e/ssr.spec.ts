import { expect, test, type Page } from '@playwright/test';

// The React package in a Next.js (App Router) app and the Vue package in a
// Nuxt app (e2e/ssr): the server sends the table as HTML, the browser hydrates
// it without a mismatch, keeps the server's elements, and the table works.
// `npm run e2e:ssr` builds both apps and sets ADT_SSR.
test.skip(process.env['ADT_SSR'] !== '1', 'npm run e2e:ssr builds the Next.js and Nuxt apps first');

const apps = [
  { name: 'Next.js (React)', url: 'http://127.0.0.1:4174' },
  { name: 'Nuxt (Vue)', url: 'http://127.0.0.1:4175' },
];

/** Console errors and warnings of the page (a hydration mismatch shows there), and uncaught errors. */
function problems(page: Page): string[] {
  const found: string[] = [];
  page.on('console', message => {
    if ((message.type() === 'error' || message.type() === 'warning') && !/favicon|Failed to load resource/.test(message.text())) found.push(message.text());
  });
  page.on('pageerror', error => found.push(error.message));
  return found;
}

/** Remembers the first <table> the HTML parser made, to see whether hydration kept it. */
async function rememberServerTable(page: Page): Promise<void> {
  await page.addInitScript(() => {
    new MutationObserver((_, observer) => {
      const table = document.querySelector('table');
      if (table) {
        (window as unknown as { serverTable: Element }).serverTable = table;
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

const names = (page: Page) => page.locator('tbody .adt-row').evaluateAll(rows => rows.map(row => row.querySelector('td[data-label="Müşteri"]')!.textContent));
const sortByCustomer = (page: Page) => page.locator('th button', { hasText: 'Müşteri' }).click();

for (const app of apps) {
  test.describe(app.name, () => {
    test('the server sends the table as HTML', async ({ request }) => {
      const html = await (await request.get(`${app.url}/`)).text();
      expect(html).toContain('<caption');
      expect(html).toContain('Müşteri 01');
      expect(html.match(/<tr class="adt-row/g)?.length).toBe(10);
      expect(html).toContain('Sayfa 2'); // the page links, in Turkish
    });

    test('hydrates without a mismatch, keeps the server\'s elements, then sorts and pages', async ({ page }) => {
      const found = problems(page);
      await rememberServerTable(page);
      await page.goto(`${app.url}/`);
      await sortByCustomer(page);
      await sortByCustomer(page); // descending: only a hydrated table answers
      await expect.poll(() => names(page).then(list => list[0])).toBe('Müşteri 30');
      expect(await page.evaluate(() => (window as unknown as { serverTable?: Element }).serverTable === document.querySelector('table'))).toBe(true);
      await page.locator('.adt-page[aria-label="Sayfa 2"]').click();
      await expect.poll(() => names(page).then(list => list[0])).toBe('Müşteri 20');
      expect(found).toEqual([]);
    });

    test('selects rows and opens a collapsed row after hydration', async ({ page }) => {
      const found = problems(page);
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(`${app.url}/`);
      await page.locator('tbody .adt-row input[type="checkbox"]').first().check();
      await expect(page.locator('.adt-selection')).toContainText('1');
      const expand = page.locator('.adt-expand').first();
      await expand.click();
      await expect(expand).toHaveAttribute('aria-expanded', 'true');
      const controls = await expand.getAttribute('aria-controls');
      await expect(page.locator(`[id="${controls}"]`)).toBeVisible();
      expect(found).toEqual([]);
    });

    test('reads its pages from the server package\'s route', async ({ page }) => {
      const found = problems(page);
      await page.goto(`${app.url}/remote`);
      await expect(page.locator('tbody .adt-row')).toHaveCount(10);
      await page.locator('th button', { hasText: 'Tutar' }).click();
      await page.locator('th button', { hasText: 'Tutar' }).click(); // descending
      await expect.poll(() => names(page).then(list => list[0])).toBe('Müşteri 28');
      await page.locator('input[type="search"]').fill('müşteri 2');
      await expect(page.locator('.adt-info')).toContainText('Toplam: 12 '); // every word: "müşteri" and "2" (2, 12, 20–29)
      expect(found).toEqual([]);
    });
  });
}
