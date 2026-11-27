import { defineConfig, devices } from '@playwright/test';

// Use the real Node production build. Each test gets an empty browser profile;
// no credentials or Firebase services are needed.
export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Finish with reports before the job's 15-minute limit, even if a runner
  // cannot provide graphics or many workflows fail for the same reason.
  globalTimeout: process.env.CI ? 12 * 60_000 : undefined,
  maxFailures: process.env.CI ? 5 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4188',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 },
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'node build/index.js',
      url: 'http://127.0.0.1:4188',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '4188',
        ORIGIN: 'http://127.0.0.1:4188', PUBLIC_ENABLE_ANALYTICS: 'false',
        HANDOFF_UPLOADS_ENABLED: 'false', HANDOFF_BUCKET: '',
        BODY_SIZE_LIMIT: '2M',
      },
    },
    // The same build with production's settings (apphosting.yaml): sharing on, analytics not turned off.
    // The bucket does not exist; tests/browser/server-environment.spec.ts never gets as far as storage.
    {
      command: 'node build/index.js',
      url: 'http://127.0.0.1:4189',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '4189',
        ORIGIN: 'http://127.0.0.1:4189',
        HANDOFF_UPLOADS_ENABLED: 'true', HANDOFF_BUCKET: 'bucket.invalid',
        ASSISTANT_SHARES_ENABLED: 'true', BODY_SIZE_LIMIT: '68M',
      },
    },
  ],
});
