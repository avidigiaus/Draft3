// Verify the demo build works
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGE: ' + e.message));

  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Check banner
  const hasBanner = await page.locator('text=DEMO MODE').count();
  console.log('Demo banner present:', hasBanner > 0);

  // Fill the form quickly
  await page.click('[data-jump="form"]');
  await page.waitForTimeout(500);

  await page.fill('[name="fullName"]', 'Demo User');
  await page.setInputFiles('[name="profileImage"]', '/tmp/test-profile.jpg');
  await page.click('#nextBtn');
  await page.waitForTimeout(300);

  await page.fill('[name="education[0][qualification]"]', "Bachelor's");
  await page.fill('[name="education[0][course]"]', 'B.Tech CS');
  await page.click('#nextBtn');
  await page.waitForTimeout(300);

  await page.fill('[name="currentOccupation"]', 'Engineer');
  await page.click('#nextBtn');
  await page.waitForTimeout(300);

  await page.fill('#skillInput', 'Python, React');
  await page.press('#skillInput', 'Enter');
  await page.click('#nextBtn');
  await page.waitForTimeout(300);

  await page.fill('[name="mobile"]', '+91 98765 43210');
  await page.fill('[name="email"]', 'demo@example.com');
  await page.click('#nextBtn');
  await page.waitForTimeout(300);

  await page.fill('[name="targetJob"]', 'Engineer');
  await page.click('#nextBtn');
  await page.waitForTimeout(500);

  await page.click('#consent');
  await page.click('#nextBtn');
  await page.waitForTimeout(2000);

  const success = await page.isVisible('#success:not([hidden])');
  console.log('Demo submit success:', success);

  const refId = await page.textContent('#refId').catch(() => 'n/a');
  console.log('Reference ID:', refId);

  await page.screenshot({ path: '/workspace/resume-service/screenshots/demo-success.png', fullPage: false });

  console.log('--- Errors ---');
  errors.forEach((e) => console.log(e));

  await browser.close();
})();
