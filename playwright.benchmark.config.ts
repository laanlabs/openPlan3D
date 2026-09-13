import { defineConfig } from '@playwright/test';
import common from './playwright.config';

// Same production build as correctness CI. Timing is informational on shared
// software-rendered runners; allocation and preservation expectations are gates.
export default defineConfig({ ...common,
  // wall-hit.bench.ts belongs to Vitest; importing it here prevents Playwright
  // from collecting any measurements because it requires Vitest's loader.
  testDir: './tests/benchmarks', testMatch: '**/viewer.bench.ts',
  outputDir: 'benchmark-results', globalTimeout: 10 * 60_000,
  // The large software-rendered scene took almost three minutes in calibration.
  // Leave per-case headroom; the suite/job limits still bound a stalled runner.
  timeout: 240_000, retries: 0,
  expect: { timeout: 60_000 },
  reporter: [['list']],
  projects: [
    { name: 'desktop', use: { ...common.projects![0].use, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
    { name: 'phone-viewport', use: { ...common.projects![0].use, viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 } },
  ],
});
