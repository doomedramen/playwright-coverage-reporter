import { test, expect } from '@playwright/test';

test('should track coverage for simple interactions', async ({ page }) => {
  // Simple test that should pass - no web server needed
  await page.goto('about:blank');

  // Set up a simple HTML structure with elements we can interact with
  await page.setContent(`
    <html>
      <body>
        <h1>Test Page</h1>
        <form id="test-form">
          <input id="email" type="email" placeholder="Email" />
          <input id="password" type="password" placeholder="Password" />
          <button id="submit-btn" type="button">Submit</button>
          <a id="link" href="#">Test Link</a>
        </form>
        <div id="results"></div>
      </body>
    </html>
  `);

  // These should be detected as covered elements
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password123');
  await page.click('#submit-btn');
  await page.click('#link');
  // Make the results div visible
  await page.evaluate(() => {
    document.getElementById('results').style.display = 'block';
  });

  // Add some assertions to ensure the test passes
  await expect(page.locator('#email')).toHaveValue('test@example.com');
  await expect(page.locator('#password')).toHaveValue('password123');
});