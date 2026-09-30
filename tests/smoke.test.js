// Headless smoke test: open the page, log console errors, screenshot
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    else if (msg.type() === 'warning') warnings.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('NAV ERROR:', e.message);
  }

  await page.waitForTimeout(1200);

  // Slowly scroll through the page using mouse wheel to trigger IO
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  await page.waitForTimeout(1500);

  // Debug: log in-view state
  const debug = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.section-head, .price-card, .how-card, .cta-strip, .progress-wrap, .pricing-banner, .form, .hero-card'));
    return items.map((el) => ({
      tag: el.className.split(' ')[0],
      inView: el.classList.contains('in-view'),
      opacity: getComputedStyle(el).opacity,
    }));
  });
  console.log('--- DEBUG in-view ---');
  debug.forEach((d) => console.log(`${d.inView ? '✓' : '✗'} ${d.tag}: opacity=${d.opacity}`));

  // Take screenshots
  await page.screenshot({ path: '/workspace/resume-service/screenshots/desktop-full.png', fullPage: true });
  await page.screenshot({ path: '/workspace/resume-service/screenshots/desktop-hero.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Test mobile
  await context.close();
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mobileCtx.newPage();
  await mPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(800);
  for (let i = 0; i < 40; i++) {
    await mPage.mouse.wheel(0, 250);
    await mPage.waitForTimeout(80);
  }
  await mPage.waitForTimeout(800);
  await mPage.evaluate(() => window.scrollTo(0, 0));
  await mPage.waitForTimeout(300);
  await mPage.screenshot({ path: '/workspace/resume-service/screenshots/mobile-full.png', fullPage: true });

  console.log('--- Errors ---');
  errors.forEach((e) => console.log(e));
  console.log('--- Warnings ---');
  warnings.forEach((w) => console.log(w));

  await browser.close();
})();
