import { expect, test } from '@playwright/test';

// The docs site has four framework groups; the pages that moved into them
// keep working at their old addresses, landing on their new section.
test('the menu has the four framework groups', async ({ page }) => {
  await page.goto('/site/index.html#/home');
  const groups = page.locator('#side .nv').filter({ hasText: /^(HTML \/ JavaScript|React · Next\.js|Vue · Nuxt|Laravel · Livewire)$/ });
  await expect(groups).toHaveCount(4);
  await expect(page.locator('#side')).not.toContainText('Angular');
  await expect(page.locator('#side .nv', { hasText: /^(Next\.js|Nuxt|Inertia|Web Component)$/ })).toHaveCount(0);
});

for (const [old, moved, heading] of [
  ['nextjs', 'react/nextjs', 'Next.js (App Router)'],
  ['nuxt', 'vue/nuxt', 'Nuxt'],
  ['inertia', 'laravel/inertia', 'Inertia (React veya Vue)'],
  ['webcomponent', 'html/webcomponent', 'Web Component: <acun-datatable>'],
  ['livewire', 'laravel', 'Laravel · Livewire'],
] as const) {
  test(`#/${old} leads to #/${moved}`, async ({ page }) => {
    await page.goto(`/site/index.html#/${old}`);
    await expect(page).toHaveURL(new RegExp(`#/${moved.replace('/', '\\/')}$`));
    const target = moved.includes('/') ? page.locator(`section#${moved.split('/')[1]} h2`) : page.locator('#content h1');
    await expect(target).toHaveText(heading);
    await expect(target).toBeInViewport();
  });
}

test('the Node.js back end has its section under the server guide', async ({ page }) => {
  await page.goto('/site/index.html#/server/node');
  await expect(page.locator('section#node h2')).toHaveText('Node.js uç noktası');
  await expect(page.locator('section#node [role="tab"]')).toHaveText(['Next.js', 'Prisma', 'Nuxt (Nitro)', 'Express']);
  await expect(page.locator('section#node h2')).toBeInViewport();
});

test.describe('keyboard and screen reader use of the docs', () => {
  test('a phone: the closed menu is out of reach, the burger says whether it is open, Escape closes it', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/site/index.html#/home');
    const burger = page.locator('#burger');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#side a').first()).toBeHidden(); // not focusable, not read out
    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#side a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await expect(burger).toBeFocused();
    await expect(page.locator('#side a').first()).toBeHidden();
  });

  test('a skip link leads to the content, and a new page puts the focus on its title', async ({ page }) => {
    await page.goto('/site/index.html#/home');
    await expect(page.locator('#skip')).toHaveText('İçeriğe geç');
    await page.locator('#skip').focus();
    await expect(page.locator('#skip')).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#content')).toBeFocused();
    await page.evaluate(() => { location.hash = '#/api'; });
    await expect(page.locator('#content h1')).toBeFocused();
    await page.locator('#lang').click();
    await expect(page.locator('#lang')).toHaveAttribute('aria-label', 'Türkçeye geç');
    await expect(page.locator('#skip')).toHaveText('Skip to content');
  });
});
