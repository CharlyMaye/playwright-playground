import { defineConfig, devices, ReporterDescription } from '@playwright/test';
import path from 'path';
import { playwrightCliOptions } from './setup/playwright.cli-options';
import { playwrightEnv } from './setup/playwright.env-vars';
import { getMonocartReporterOptions } from './setup/playwright.monocart-reporter';
import { setup } from './setup/setup';

// TODO: move this to a separate file and export it so it can be used in the global setup and in the config file.
// const _webServerPort = 4200;
// const _webServerHost = '127.0.0.1';
// const _webServerUrl = `http://${_webServerHost}:${_webServerPort}`;
// const _webServerCommand = playwrightCliOptions.UIMode
//   ? `npx ng serve --host ${_webServerHost} --port ${_webServerPort}`
//   : `npx ng serve --host ${_webServerHost} --port ${_webServerPort} --watch false`;

const _isRunningOnCI = playwrightEnv.CI;
const _testsDir = path.resolve('./tests');
const _testResultsDir = path.resolve('./test-results');
const _codeCoverageDir = path.resolve(_testResultsDir, 'code-coverage');
const _playwrightReportDir = path.resolve('./test-results', 'html-report');

let _reporters: ReporterDescription[];
if (playwrightCliOptions.UIMode) {
  // Limit the reporters when running in UI mode.
  // This speeds up UI mode since each reporter takes time creating their report after a test run.
  // For maximum efficiency you could leave the reporters empty when running in UI mode.
  _reporters = [['list']];
} else {
  _reporters = [
    ['list'],
    [
      // See https://github.com/cenfun/monocart-reporter
      'monocart-reporter',
      getMonocartReporterOptions(_testResultsDir, _codeCoverageDir),
    ],
    [
      'html',
      {
        outputFolder: _playwrightReportDir,
        open: 'never',
      },
    ],
  ];
}

setup();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: _testsDir,
  outputDir: path.resolve(_testResultsDir, 'artifacts'),
  fullyParallel: true,
  forbidOnly: _isRunningOnCI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : '50%',
  globalSetup: require.resolve('./setup/playwright.global-setup.ts'),
  reporter: _reporters,
  use: {
    locale: 'en-GB',
    timezoneId: 'Europe/Paris',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    actionTimeout: 2000,
    navigationTimeout: 10 * 1000,
    bypassCSP: true,
    headless: true,
    launchOptions: {
      slowMo: 50,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup injector',
      testDir: './setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'unit-tests',
      testDir: '.',
      testMatch: /(__tests__\/.*\.spec\.ts)$/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup injector'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup injector'],
    },
    {
      name: 'exploration',
      testDir: './tests/exploration',
      testMatch: /\.generate\.ts$/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup injector'],
    },

    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    //   dependencies: ["setup injector"],
    // },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    //   dependencies: ["setup injector"],
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  // globalSetup: "./setup/global-setup",
  // globalSetup: "./setup/transpilation-hook.ts",
  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
