// Test the full form submission flow
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Navigate to form
  await page.click('[data-jump="form"]');
  await page.waitForTimeout(800);

  console.log('--- Step 1: Personal Info ---');
  await page.fill('[name="fullName"]', 'Test User Form');

  // Upload profile image
  const fs = require('fs');
  await page.setInputFiles('[name="profileImage"]', '/tmp/test-profile.jpg');
  await page.waitForTimeout(300);

  // Take screenshot of step 1 filled
  await page.screenshot({ path: '/workspace/resume-service/screenshots/form-step1.png', fullPage: false });

  // Click Next
  await page.click('#nextBtn');
  await page.waitForTimeout(500);
  console.log('Step 2 active:', await page.isVisible('fieldset[data-step="2"].active'));

  console.log('--- Step 2: Education ---');
  await page.fill('[name="education[0][qualification]"]', "Bachelor's Degree");
  await page.fill('[name="education[0][course]"]', 'B.Tech Computer Science');
  await page.fill('[name="education[0][college]"]', 'IIT Bombay');
  await page.fill('[name="education[0][year]"]', '2023');
  await page.fill('[name="education[0][description]"]', 'Specialized in AI/ML');
  await page.fill('[name="certifications[0][name]"]', 'AWS Certified');
  await page.fill('[name="certifications[0][org]"]', 'Amazon');
  await page.fill('[name="certifications[0][year]"]', '2024');
  await page.click('#nextBtn');
  await page.waitForTimeout(500);
  console.log('Step 3 active:', await page.isVisible('fieldset[data-step="3"].active'));

  console.log('--- Step 3: Experience ---');
  await page.fill('[name="currentOccupation"]', 'Senior Software Engineer');
  await page.fill('[name="currentOrganization"]', 'Tech Corp');
  await page.fill('[name="yearsExperience"]', '5');
  await page.fill('[name="about"]', 'Passionate about building great products.');
  await page.click('#nextBtn');
  await page.waitForTimeout(500);
  console.log('Step 4 active:', await page.isVisible('fieldset[data-step="4"].active'));

  console.log('--- Step 4: Skills ---');
  await page.fill('#skillInput', 'Python, JavaScript, React');
  await page.press('#skillInput', 'Enter');
  await page.fill('#skillInput', 'AWS, Docker');
  await page.press('#skillInput', 'Enter');
  await page.waitForTimeout(300);
  const skillsCount = await page.$$eval('#skillChips .chip', (els) => els.length);
  console.log('Skills added:', skillsCount);
  await page.click('#nextBtn');
  await page.waitForTimeout(500);
  console.log('Step 5 active:', await page.isVisible('fieldset[data-step="5"].active'));

  console.log('--- Step 5: Contact ---');
  await page.fill('[name="mobile"]', '+91 98765 43210');
  await page.fill('[name="email"]', `formtest${Date.now()}@example.com`);
  await page.fill('[name="linkedin"]', 'https://linkedin.com/in/test');
  await page.fill('[name="location"]', 'Mumbai, India');
  await page.click('#nextBtn');
  await page.waitForTimeout(500);
  console.log('Step 6 active:', await page.isVisible('fieldset[data-step="6"].active'));

  console.log('--- Step 6: Preferences ---');
  await page.click('label.radio-card:has-text("Corporate")');
  await page.click('label.radio-card:has-text("Black")');
  await page.fill('[name="targetJob"]', 'Senior Software Engineer');
  await page.click('#nextBtn');
  await page.waitForTimeout(500);
  console.log('Step 7 active:', await page.isVisible('fieldset[data-step="7"].active'));

  // Screenshot the review page
  await page.evaluate(() => document.getElementById('form').scrollIntoView());
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/workspace/resume-service/screenshots/form-step7-review.png', fullPage: true });

  console.log('--- Step 7: Review & Submit ---');
  // Check the consent box
  await page.click('#consent');
  await page.waitForTimeout(300);

  // Submit
  await page.click('#nextBtn');
  await page.waitForTimeout(2500); // Wait for submission

  // Check success state
  const successVisible = await page.isVisible('#success:not([hidden])');
  console.log('Success state:', successVisible);

  await page.screenshot({ path: '/workspace/resume-service/screenshots/form-success.png', fullPage: false });

  console.log('--- Errors ---');
  errors.forEach((e) => console.log(e));

  await browser.close();
})();
