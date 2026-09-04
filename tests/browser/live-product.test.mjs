import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url = process.env.LIVE_APP_URL || 'https://protocol-errata-reserve-genlayer.vercel.app';

for (const [name, viewport] of Object.entries({
  desktop: {width: 1440, height: 900},
  mobile: {width: 390, height: 844},
})) {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport});
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('requestfailed', (request) => errors.push(`${request.url()} ${request.failure()?.errorText}`));

  try {
    await page.goto(url, {waitUntil: 'networkidle'});
    assert.equal(await page.locator('h1').first().innerText(), 'Protocol remediation reserves');
    await assert.rejects(() => page.getByRole('heading', {name: 'Lifecycle actions'}).waitFor({timeout: 500}));
    await page.getByRole('link', {name: 'Try it step by step'}).click();
    await page.getByRole('heading', {name: /Start a remediation reserve/}).waitFor();
    await page.getByRole('link', {name: 'History'}).click();
    await page.getByText(/RFC2865 section 4.1/).waitFor();
    await page.getByRole('link', {name: /View case/}).first().click();
    await page.getByText(/1.00 GEN implementer credit/).waitFor();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert.equal(overflow, false, `${name} has horizontal overflow`);
    assert.deepEqual(errors, []);
    await page.screenshot({path: `docs/evidence/studionet/live-prod-${name}.png`, fullPage: true});
    console.log(`${name}: PASS`);
  } finally {
    await browser.close();
  }
}
