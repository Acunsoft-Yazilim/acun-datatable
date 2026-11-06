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
    await expect(page.locator('#lang')).toHaveAttribute('aria-label', 'EN: Türkçeye geç'); // the visible EN is in the name
    await expect(page.locator('#theme')).toHaveAttribute('aria-pressed', /^(true|false)$/);
    await expect(page.locator('#skip')).toHaveText('Skip to content');
  });
});

test('search: Ctrl+K finds a section whatever the accents, Enter opens it', async ({ page }) => {
  await page.goto('/site/index.html#/home');
  await expect(page.locator('#ver')).toHaveText(/^v\d+\.\d+\.\d+$/);
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Ara' });
  await expect(dialog).toBeVisible();
  await page.keyboard.type('sinirlar sayfa basi');
  await expect(dialog.locator('#sres a').first()).toHaveAttribute('href', '#/pagesize/limits');
  await expect(dialog.locator('#sres a').first().locator('mark').first()).toHaveText('Sınırlar');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/pagesize\/limits$/);
  await expect(page.locator('section#limits h2')).toBeInViewport();
  await page.keyboard.press('/');
  await expect(dialog).toBeVisible();
  await page.keyboard.type('zzzz');
  await expect(dialog).toContainText('Sonuç bulunamadı.');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#search')).toBeFocused();
});

test('every page ends with the previous and next page in menu order, and where to report a mistake', async ({ page }) => {
  await page.goto('/site/index.html#/filters');
  const pager = page.getByRole('navigation', { name: 'Sayfalar' });
  await expect(pager.getByRole('link')).toHaveText(['← ÖncekiSunucu tarafı', 'Sonraki →Araçlar, hücreler ve düzenleme']);
  await expect(page.locator('.report a')).toHaveAttribute('href', /github\.com\/Acunsoft-Yazilim\/acun-datatable\/issues\/new\?title=Docs%3A\+Filtreler/);
  await pager.getByRole('link', { name: /Sonraki/ }).click();
  await expect(page).toHaveURL(/#\/tools$/);
  await expect(page.locator('#content h1')).toHaveText('Araçlar, hücreler ve düzenleme');
  await page.goto('/site/index.html#/home');
  await expect(pager.getByRole('link')).toHaveCount(1); // the first page has no previous one
});

test('each framework page starts with its requirements and says when the first table is ready', async ({ page }) => {
  for (const [route, first] of [['html', 'Tarayıcı'], ['react', 'React'], ['vue', 'Vue'], ['laravel', 'PHP']] as const) {
    await page.goto(`/site/index.html#/${route}`);
    await expect(page.locator('section').first()).toHaveAttribute('id', 'req');
    await expect(page.locator('#req .req b').first()).toHaveText(first);
    await expect(page.locator('#usage .note.ok')).toContainText('Hazırsınız.');
  }
  await page.goto('/site/index.html#/home');
  await expect(page.locator('#s1 .steps > li')).toHaveCount(4);
  await expect(page.locator('#s1 .note.ok')).toContainText('Hazırsınız.');
});

test('release notes: under "Getting started", newest first, reached from the version in the header', async ({ page }) => {
  await page.goto('/site/index.html#/home');
  await page.locator('#ver').click();
  await expect(page).toHaveURL(/#\/releases$/);
  await expect(page.locator('#content h1')).toHaveText('Sürüm notları');
  await expect(page.locator('#tnav a.on')).toHaveText('Başlangıç');
  await expect(page.locator('section h2').first()).toHaveText(/^npm \d+\.\d+\.\d+ · Laravel \d+\.\d+\.\d+$/);
  await expect(page.locator('section h2').first()).toContainText(await page.locator('#ver').textContent().then(v => v!.slice(1)));
});
