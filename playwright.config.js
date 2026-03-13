const { defineConfig } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://shopping-listapp-nu-nine.vercel.app';

module.exports = defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
  },
  reporter: [['list'], ['html', { open: 'on-failure' }]],
});
