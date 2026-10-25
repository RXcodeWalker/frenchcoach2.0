/**
 * Renders scripts/seo/og-image.html to public/og-image.png (1200×630).
 * Run manually when the design changes: `npx tsx scripts/seo/renderOgImage.ts`.
 * Needs network access for the Google Fonts the template loads.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, 'og-image.html');
const OUTPUT = join(here, '../../public/og-image.png');

async function main() {
  const browser = await chromium.launch(
    process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
  );
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: OUTPUT, type: 'png' });
    console.log(`[og-image] wrote ${OUTPUT}`);
  } finally {
    await browser.close();
  }
}

void main();
