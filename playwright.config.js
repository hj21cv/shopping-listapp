const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'file://' + path.resolve(__dirname, 'shopping-list.html').replace(/\\/g, '/'),
    headless: false,   // 브라우저 창을 직접 볼 수 있게
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['list'], ['html', { open: 'on-failure' }]],
});
