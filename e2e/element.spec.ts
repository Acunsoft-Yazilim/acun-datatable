import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Two <acun-datatable> elements whose properties the page sets before the
// <script> build defines the element (a deferred script, or a framework that
// renders first): both tables appear, keep to themselves, and take changes
// in place.
const open = async (page: Page) => {
  await page.goto('/e2e/fixtures/elements.html');
  await expect(page.locator('acun-datatable.orders tbody .adt-row')).toHaveCount(10);
  await expect(page.locator('acun-datatable.products tbody .adt-row')).toHaveCount(5);
};
const first = (page: Page, table: string) => page.locator(`acun-datatable.${table} tbody .adt-row`).first().locator('td[data-label]').first();

test('properties set before the element was defined are used', async ({ page }) => {
  await open(page);
  await expect(first(page, 'orders')).toHaveText('Müşteri 01');
  await expect(page.locator('acun-datatable.orders .adt-info')).toContainText('30 kaydın');
  expect(await page.evaluate(() => (window as unknown as { events: string[] }).events.filter(event => event.startsWith('ready')).sort()))
    .toEqual(['ready:orders', 'ready:products']); // bubbled to the document
});

test('each table keeps to itself: pages, search by keyboard, element ids, saved state', async ({ page }) => {
  await open(page);
  await page.locator('acun-datatable.orders').getByRole('button', { name: 'Sayfa 2' }).click();
  await expect(first(page, 'orders')).toHaveText('Müşteri 11');
  await expect(first(page, 'products')).toHaveText('Ürün 01');
  await page.locator('acun-datatable.products input[type="search"]').focus();
  await page.keyboard.type('"ürün 1"'); // a phrase: 10, 11, 12 (the words alone would also find stock 1x)
  await expect(page.locator('acun-datatable.products .adt-info')).toContainText('Toplam: 3 kaydın');
  await expect(page.locator('acun-datatable.orders .adt-info')).toContainText('30 kaydın');
  const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('acun-datatable:')).sort());
  expect(keys).toEqual(['acun-datatable:/e2e/fixtures/elements.html#table', 'acun-datatable:/e2e/fixtures/elements.html#table-2']);
});

test('a new language keeps the page, the search and the selection; a new page size changes in place', async ({ page }) => {
  await open(page);
  const orders = page.locator('acun-datatable.orders');
  await orders.locator('input[type="search"]').fill('müşteri');
  await page.waitForFunction(() => (document.querySelector('acun-datatable.orders') as unknown as { table: { table: { getState(): { globalSearch: string } } } }).table.table.getState().globalSearch === 'müşteri'); // after the typing delay
  await orders.getByRole('button', { name: 'Sayfa 2' }).click();
  await orders.locator('tbody .adt-row input[type="checkbox"]').first().check();
  await page.evaluate(() => { document.querySelector('acun-datatable.orders')!.setAttribute('language', 'en'); });
  await expect(orders.locator('.adt-info')).toContainText('Showing 11 to 20 of 30');
  await expect(orders.locator('input[type="search"]')).toHaveValue('müşteri');
  await expect(orders.locator('tbody .adt-row input[type="checkbox"]').first()).toBeChecked();
  type Element = { table: { mark?: boolean }; pageSize: number };
  await page.evaluate(() => { (document.querySelector('acun-datatable.orders') as unknown as Element).table.mark = true; });
  await page.evaluate(() => { (document.querySelector('acun-datatable.orders') as unknown as Element).pageSize = 25; });
  await expect(orders.locator('tbody .adt-row')).toHaveCount(25);
  expect(await page.evaluate(() => (document.querySelector('acun-datatable.orders') as unknown as Element).table.mark)).toBe(true); // the same table
});

test('two tables on a page pass axe', async ({ page }) => {
  await open(page);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map(violation => violation.id)).toEqual([]);
});
