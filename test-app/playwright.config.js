"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : 2,
    reporter: [
        ['html'],
        ['json', { outputFile: 'test-results.json' }],
        ['list']
    ],
    use: {
        baseURL: 'file://' + __dirname + '/',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        timeout: 30000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...test_1.devices['Desktop Chrome'] },
        },
    ],
    globalSetup: require.resolve('./tests/global-setup.ts'),
    globalTeardown: require.resolve('./tests/global-teardown.ts'),
});
