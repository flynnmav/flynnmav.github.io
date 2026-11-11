import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4322';
const executablePath = process.env.BROWSER_PATH;
const browser = await chromium.launch(
  executablePath
    ? { executablePath }
    : { channel: process.platform === 'win32' ? 'msedge' : 'chrome' },
);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const results = [];
try {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      '/',
      '/about/',
      '/projects/',
      '/code/',
      '/projects/trajectory-mpc/',
      '/blog/',
      '/blog/mpc-notes/',
      '/blog/about-this-site/',
      '/publications/',
      '/contact/',
    ]) {
      const response = await page.goto(base + route);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(response.status(), 200, route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, width + ' ' + route + ' overflow');
      results.push({ width, route, status: response.status(), overflow });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/code/');
  const privateNames = [
    'adaptive-safety-flight',
    'beetle-omni-isaac',
    'omni_intercept',
    'omini_quadrone',
    'tilt-quadrotor-wrench',
    'Reinforcement-Learning-based-UAV-Formation-Control',
    'Interceptor_gazebo-sim-',
    'ppo',
    'vision_yolov10',
    'bambu-fleet-console',
  ];
  const privateCards = page.locator(
    'article.repo-card[data-visibility="private"]',
  );
  assert.equal(await privateCards.count(), privateNames.length);
  assert.equal(await privateCards.locator('a').count(), 0);
  assert.equal(
    await page.locator('article.repo-card .repo-private').count(),
    privateNames.length,
  );
  const cardHrefs = await page
    .locator('article.repo-card a')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href') || ''));
  const html = await page.content();
  for (const name of privateNames) {
    assert.equal(
      html.includes('github.com/flynnmav/' + name),
      false,
      'private repo linked: ' + name,
    );
  }
  for (const href of cardHrefs) {
    assert.ok(
      href.startsWith('https://github.com/flynnmav/') ||
        href === 'https://flynnmav.github.io/gc-lit-review/',
      href,
    );
  }
  assert.ok(cardHrefs.includes('https://github.com/flynnmav/flightvla-guard'));
  assert.ok(
    (await page.locator('a[href="https://github.com/flynnmav"]').count()) > 0,
  );
  await page.goto(base + '/blog/mpc-notes/');
  const math = {
    all: await page.locator('.katex').count(),
    display: await page.locator('.katex-display').count(),
    errors: await page.locator('.katex-error').count(),
  };
  assert.ok(math.all > math.display && math.display > 0);
  assert.equal(math.errors, 0);
  assert.ok((await page.locator('pre.astro-code span[style]').count()) > 0);
  const anchor = page.locator('.toc nav a').first();
  await anchor.click();
  assert.ok(new URL(page.url()).hash);
  await page.goto(base + '/blog/');
  await page.getByRole('link', { name: 'Control', exact: true }).click();
  assert.ok(page.url().includes('/categories/Control/'));
  await page.goto(base + '/not-a-real-page/');
  assert.ok((await page.textContent('body')).includes('这条路径还没有抵达'));
  // A 404 network response is expected for the missing-page check.
  const unexpected = errors.filter((e) => !e.includes('404'));
  assert.deepEqual(unexpected, []);
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(
    'test-results/browser.json',
    JSON.stringify({ results, math, unexpected }, null, 2),
  );
  console.log(
    JSON.stringify(
      { viewportChecks: results.length, math, unexpected },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
