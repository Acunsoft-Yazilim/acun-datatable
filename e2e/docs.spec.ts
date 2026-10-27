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
