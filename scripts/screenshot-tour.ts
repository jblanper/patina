/**
 * Screenshot Tour — captures all major routes of the Patina Electron app.
 *
 * Starts the Vite dev server, launches Electron against it, captures
 * screenshots of all routes, then tears everything down.
 *
 * Usage:
 *   npx tsx scripts/screenshot-tour.ts
 *
 * Screenshots are saved to screenshots/ in the project root.
 * Requires: playwright (dev dependency), compiled main process (npm run build:main).
 */

import { _electron as electron } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'screenshots');
const DEV_SERVER_URL = 'http://localhost:3000';
const DEV_SERVER_READY_TIMEOUT = 30_000;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Dev server ────────────────────────────────────────────────────────────────

function startDevServer(): { proc: ChildProcess; ready: Promise<void> } {
  const proc = spawn('npx', ['vite', '--port', '3000'], {
    cwd: process.cwd(),
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite dev server timed out')), DEV_SERVER_READY_TIMEOUT);

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      // Vite prints "Local:   http://localhost:3000/" when ready
      if (text.includes('localhost:3000')) {
        clearTimeout(timer);
        resolve();
      }
    });

    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timer);
        reject(new Error(`Vite exited with code ${code}`));
      }
    });
  });

  return { proc, ready };
}

// ── Screenshot helpers ────────────────────────────────────────────────────────

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>;

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForSelector('#root > *', { timeout: 15_000 });
  await page.waitForTimeout(1000);
}

async function screenshot(page: Page, name: string): Promise<void> {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  ✓ ${name}.png`);
}

async function navigate(page: Page, hash: string, settleMs = 1000): Promise<void> {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  await page.waitForTimeout(settleMs);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log('Starting Vite dev server…');
  const { proc: viteProc, ready } = startDevServer();

  try {
    await ready;
    console.log('Dev server ready.');

    console.log('Launching Patina…');
    const app = await electron.launch({
      args: [path.join(process.cwd(), 'dist/main/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_DEV_SERVER_URL: DEV_SERVER_URL,
      },
    });

    const page = await app.firstWindow();
    page.on('console', () => {});

    try {
      console.log('\nCapturing screenshots:');

      // 1. Cabinet — gallery grid (default route)
      await waitForAppReady(page);
      await screenshot(page, '01-cabinet');

      // 2. Cabinet — filter panel open
      const filtersBtn = page.locator('button', { hasText: /filters/i }).first();
      const filtersVisible = await filtersBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (filtersVisible) {
        await filtersBtn.click();
        await page.waitForTimeout(500);
        await screenshot(page, '02-cabinet-filters-open');
        await filtersBtn.click();
        await page.waitForTimeout(300);
      }

      // 3. Coin Detail
      await navigate(page, '#/coin/1');
      await screenshot(page, '03-coin-detail');

      // 4. Scriptorium — Add form
      await navigate(page, '#/scriptorium/add');
      await screenshot(page, '04-scriptorium-add');

      // 5. Scriptorium — Edit form (pre-filled)
      await navigate(page, '#/scriptorium/edit/1');
      await screenshot(page, '05-scriptorium-edit');

      // 6. Cabinet — scrolled to bottom to show full grid
      await navigate(page, '#/', 800);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
      await screenshot(page, '06-cabinet-scrolled');

      console.log(`\nDone. ${OUTPUT_DIR}`);
    } finally {
      await app.close();
    }
  } finally {
    viteProc.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('\nScreenshot tour failed:', err.message ?? err);
  process.exit(1);
});
