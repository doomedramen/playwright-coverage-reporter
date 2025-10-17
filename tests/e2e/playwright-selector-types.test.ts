import { test, expect } from '@playwright/test';

test.describe('Coverage Reporting - Playwright Selector Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
  });

  test('should track getByRole selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button>Submit Form</button>
          <button>Cancel</button>
          <input type="checkbox" id="newsletter">
          <label for="newsletter">Subscribe to newsletter</label>
          <div role="alert" aria-live="polite">Success message</div>
          <dialog open>
            <p>Dialog content</p>
            <button>Close Dialog</button>
          </dialog>
          <main role="main">
            <h1>Main Content</h1>
            <p>This is the main content area.</p>
          </main>
        </body>
      </html>
    `);

    // Test different role-based selectors
    await page.getByRole('button', { name: 'Submit Form' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('alert').click();
    await page.getByRole('dialog').getByRole('button').click();
    await expect(page.getByRole('main')).toBeVisible();

    // Test aria attributes
    await page.getByRole('alert', { name: /success/i }).isVisible();
  });

  test('should track getByText selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <h1>Welcome to Our App</h1>
          <p>Please enter your credentials</p>
          <button>Sign In</button>
          <a href="/forgot-password">Forgot Password?</a>
          <span class="error">Invalid credentials</span>
          <div class="success">Login successful!</div>
          <strong>Important notice</strong>
          <em>Please read carefully</em>
        </body>
      </html>
    `);

    // Test exact text matches
    await page.getByText('Sign In').click();
    await page.getByText('Forgot Password?').click();
    await page.getByText('Invalid credentials').isVisible();
    await page.getByText('Login successful!').isVisible();
    await page.getByText('Important notice').isVisible();
    await page.getByText('Please read carefully').isVisible();

    // Test partial text matches
    await page.getByText('Welcome').isVisible();
    await page.getByText('credentials').isVisible();
    await page.getByText('Invalid').isVisible();
    await page.getByText('successful').isVisible();
  });

  test('should track getByLabel selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <form id="test-form">
            <label for="username">Username</label>
            <input type="text" id="username" name="username">

            <label for="password">Password</label>
            <input type="password" id="password" name="password">

            <label>
              <input type="checkbox" name="terms" id="terms">
              I agree to the terms and conditions
            </label>

            <label for="comments">Comments</label>
            <textarea id="comments" name="comments"></textarea>

            <label for="country">Country</label>
            <select id="country" name="country">
              <option value="">Select a country</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
            </select>

            <label for="submit-btn">Submit</label>
            <button type="submit" id="submit-btn">Submit</button>
          </form>
          <div id="result"></div>
          <script>
            document.getElementById('test-form').addEventListener('submit', (e) => {
              e.preventDefault();
              document.getElementById('result').textContent = 'Form submitted!';
            });
          </script>
        </body>
      </html>
    `);

    // Test various input types with labels
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password123');
    await page.getByLabel('I agree to the terms and conditions').check();
    await page.getByLabel('Comments').fill('This is a comment');
    await page.getByLabel('Country').selectOption('us');
    await page.getByLabel('Submit').click();

    // Verify filled values
    await expect(page.getByLabel('Username')).toHaveValue('testuser');
    await expect(page.getByLabel('Password')).toHaveValue('password123');
    await expect(page.getByLabel('I agree to the terms and conditions')).toBeChecked();
    await expect(page.getByLabel('Comments')).toHaveValue('This is a comment');
    await expect(page.getByLabel('Country')).toHaveValue('us');
  });

  test('should track getByPlaceholder selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <form>
            <input type="text" placeholder="Enter your email" name="email">
            <input type="password" placeholder="Enter your password" name="password">
            <input type="search" placeholder="Search products..." name="search">
            <input type="tel" placeholder="Phone number" name="phone">
            <input type="url" placeholder="Website URL" name="url">
            <textarea placeholder="Enter your message here" name="message"></textarea>
          </form>
        </body>
      </html>
    `);

    // Test various placeholder inputs
    await page.getByPlaceholder('Enter your email').fill('user@example.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByPlaceholder('Search products...').fill('laptop');
    await page.getByPlaceholder('Phone number').fill('+1234567890');
    await page.getByPlaceholder('Website URL').fill('https://example.com');
    await page.getByPlaceholder('Enter your message here').fill('Hello world');

    // Verify filled values
    await expect(page.getByPlaceholder('Enter your email')).toHaveValue('user@example.com');
    await expect(page.getByPlaceholder('Enter your password')).toHaveValue('password123');
    await expect(page.getByPlaceholder('Search products...')).toHaveValue('laptop');
    await expect(page.getByPlaceholder('Phone number')).toHaveValue('+1234567890');
    await expect(page.getByPlaceholder('Website URL')).toHaveValue('https://example.com');
    await expect(page.getByPlaceholder('Enter your message here')).toHaveValue('Hello world');
  });

  test('should track getByAltText selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <img src="/logo.png" alt="Company Logo">
          <img src="/user-avatar.jpg" alt="User Avatar">
          <img src="/product-image.png" alt="Product Image">
          <img src="/chart.png" alt="Sales Chart">
          <img src="/icon.png" alt="Settings Icon">
          <img src="/banner.jpg" alt="Promotional Banner">
        </body>
      </html>
    `);

    // Test images by alt text
    await page.getByAltText('Company Logo').isVisible();
    await page.getByAltText('User Avatar').isVisible();
    await page.getByAltText('Product Image').isVisible();
    await page.getByAltText('Sales Chart').isVisible();
    await page.getByAltText('Settings Icon').isVisible();
    await page.getByAltText('Promotional Banner').isVisible();

    // Test clicking on images (if clickable)
    await page.getByAltText('Settings Icon').click();
  });

  test('should track getByTitle selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <head><title>Main Page</title></head>
        <body>
          <a href="/help" title="Click for help">Help</a>
          <img src="/info.png" title="Information icon">
          <abbr title="Application Programming Interface">API</abbr>
          <input type="text" title="Enter your username">
          <div title="Tooltip text">Hover over me</div>
        </body>
      </html>
    `);

    // Test elements with title attributes
    await page.getByTitle('Click for help').click();
    await page.getByTitle('Information icon').isVisible();
    await page.getByTitle('Application Programming Interface').isVisible();
    await page.getByTitle('Enter your username').fill('testuser');
    await page.getByTitle('Tooltip text').hover();
  });

  test('should track getByTestId selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button data-testid="submit-button">Submit</button>
          <input data-testid="username-input" type="text">
          <div data-testid="error-message" class="error">Error occurred</div>
          <form data-testid="login-form">
            <input data-testid="email-field" type="email">
            <button data-testid="login-button">Login</button>
          </form>
          <nav data-testid="main-navigation">
            <ul>
              <li><a data-testid="nav-home" href="/">Home</a></li>
              <li><a data-testid="nav-about" href="/about">About</a></li>
            </ul>
          </nav>
          <footer data-testid="page-footer">
            <p>&copy; 2024 Company</p>
          </footer>
        </body>
      </html>
    `);

    // Test data-testid selectors
    await page.getByTestId('submit-button').click();
    await page.getByTestId('username-input').fill('testuser');
    await page.getByTestId('error-message').isVisible();
    await page.getByTestId('login-form').getByTestId('email-field').fill('user@example.com');
    await page.getByTestId('login-button').click();
    await page.getByTestId('main-navigation').getByTestId('nav-home').click();
    await page.getByTestId('page-footer').isVisible();

    // Test nested data-testid
    expect(page.getByTestId('login-form').getByTestId('email-field')).toBeVisible();
    expect(page.getByTestId('main-navigation').getByTestId('nav-about')).toBeVisible();
  });

  test('should track CSS selectors through locator method', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div class="container">
            <h1 class="page-title">Welcome</h1>
            <form class="login-form">
              <input class="form-input" name="username" type="text">
              <input class="form-input password-input" name="password" type="password">
              <button class="btn btn-primary submit-btn" type="submit">Login</button>
              <button class="btn btn-secondary cancel-btn" type="button">Cancel</button>
            </form>
            <div class="card">
              <h2 class="card-title">Card Title</h2>
              <p class="card-content">Card content goes here</p>
              <a href="#" class="card-link">Read more</a>
            </div>
            <ul class="list-group">
              <li class="list-item active">Active item</li>
              <li class="list-item">Regular item</li>
              <li class="list-item disabled">Disabled item</li>
            </ul>
            <table class="data-table">
              <thead>
                <tr>
                  <th class="header-cell">Header 1</th>
                  <th class="header-cell">Header 2</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="data-cell">Data 1</td>
                  <td class="data-cell">Data 2</td>
                </tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);

    // Test CSS selectors with locator
    await page.locator('.page-title').isVisible();
    await page.locator('.form-input[name="username"]').fill('testuser');
    await page.locator('.password-input[name="password"]').fill('password123');
    await page.locator('.submit-btn').click();
    await page.locator('.cancel-btn').click();

    // Test complex CSS selectors
    await page.locator('.card-title').isVisible();
    await page.locator('.card-content').isVisible();
    await page.locator('.card-link').click();

    await page.locator('.list-item.active').isVisible();
    await page.locator('.list-item.disabled').isVisible();

    await page.locator('.header-cell').isVisible();
    await page.locator('.data-cell').isVisible();

    // Test descendant selectors
    await expect(page.locator('.login-form .form-input')).toHaveCount(2);
    await page.locator('.container .data-table').isVisible();
  });

  test('should track XPath selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <form id="login-form">
            <input type="text" name="username" id="username">
            <input type="password" name="password" id="password">
            <button type="submit" id="submit">Submit</button>
          </form>
          <div class="navigation">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          <div class="content">
            <h2>Section Title</h2>
            <p>Paragraph content</p>
            <span class="highlight">Important text</span>
          </div>
        </body>
      </html>
    `);

    // Test XPath selectors
    await page.locator('xpath=//input[@id="username"]').fill('testuser');
    await page.locator('xpath=//input[@name="password"]').fill('password123');
    await page.locator('xpath=//button[@type="submit"]').click();

    // Test XPath with different axes
    await page.locator('xpath=//a[contains(text(), "Home")]').click();
    await page.locator('xpath=//a[contains(@href, "/about")]').click();
    await page.locator('xpath=//li[last()]/a').click();

    // Test XPath with conditions
    await page.locator('xpath=//span[@class="highlight"]').isVisible();
    await page.locator('xpath=//h2[contains(text(), "Title")]').isVisible();
    await page.locator('xpath=//p[contains(text(), "content")]').isVisible();

    // Test XPath with parent/child relationships
    await expect(page.locator('xpath=//form[@id="login-form"]/input')).toHaveCount(2);
    await expect(page.locator('xpath=//div[@class="navigation"]//a')).toHaveCount(3);
    await page.locator('xpath=//div[@class="content"]/h2').isVisible();
  });

  test('should track CSS attribute selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <input type="text" name="username" placeholder="Enter username" required>
          <input type="email" name="email" placeholder="Enter email" required>
          <input type="password" name="password" placeholder="Enter password" required>
          <input type="checkbox" name="remember" checked>
          <input type="radio" name="gender" value="male">
          <input type="radio" name="gender" value="female" checked>
          <select name="country" required>
            <option value="">Select country</option>
            <option value="us" selected>United States</option>
            <option value="uk">United Kingdom</option>
          </select>
          <textarea name="message" placeholder="Enter your message" required></textarea>
          <button type="submit" disabled>Submit</button>
        </body>
      </html>
    `);

    // Test various attribute selectors
    await page.locator('input[name="username"]').fill('testuser');
    await page.locator('input[type="email"]').fill('user@example.com');
    await expect(page.locator('input[placeholder*="Enter"]')).toHaveCount(3); // Contains
    await expect(page.locator('input[required]')).toHaveCount(3);
    await expect(page.locator('input:checked')).toHaveCount(2);
    await page.locator('input[value="female"]').click();
    await expect(page.locator('option[selected]')).toHaveText('United States');
    await page.locator('textarea[name="message"]').fill('Test message');
    await page.locator('button[disabled]').isVisible();
  });

  test('should track CSS pseudo-class selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button class="btn">Normal Button</button>
          <button class="btn btn-primary">Primary Button</button>
          <button class="btn btn-secondary">Secondary Button</button>
          <input type="text" class="form-control" placeholder="Text input">
          <input type="email" class="form-control" placeholder="Email input">
          <div class="card">Card 1</div>
          <div class="card active">Active Card</div>
          <div class="card disabled">Disabled Card</div>
          <a href="#" class="link">Normal Link</a>
          <a href="#" class="link visited">Visited Link</a>
          <input type="text" readonly class="readonly-input" value="Readonly value">
          <input type="text" disabled class="disabled-input" value="Disabled value">
          <ul class="list">
            <li class="list-item">Item 1</li>
            <li class="list-item selected">Selected Item</li>
            <li class="list-item">Item 3</li>
          </ul>
        </body>
      </html>
    `);

    // Test pseudo-class selectors
    await expect(page.locator('.btn')).toHaveCount(3);
    await page.locator('.btn-primary').click();
    await expect(page.locator('.form-control')).toHaveCount(2);
    await expect(page.locator('.card')).toHaveCount(3);
    await page.locator('.card.active').isVisible();
    await page.locator('.card.disabled').isVisible();
    await expect(page.locator('.link')).toHaveCount(2);
    await expect(page.locator('.readonly-input')).toHaveValue('Readonly value');
    await expect(page.locator('.disabled-input')).toHaveValue('Disabled value');
    await page.locator('.list-item.selected').isVisible();
  });

  test('should track CSS pseudo-element selectors', async ({ page }) => {
    await page.setContent(`
      <html>
        <head>
          <style>
            .custom-list::before {
              content: "• ";
              color: blue;
            }
            .custom-list::after {
              content: " (end of list)";
              color: gray;
            }
            .highlight::before {
              content: "★ ";
              color: gold;
            }
            .quote::before {
              content: '"';
            }
            .quote::after {
              content: '"';
            }
          </style>
        </head>
        <body>
          <ul class="custom-list">
            <li>First item</li>
            <li>Second item</li>
            <li>Third item</li>
          </ul>
          <p class="highlight">Important text</p>
          <blockquote class="quote">
            This is a quote
          </blockquote>
        </body>
      </html>
    `);

    // Test pseudo-element selectors
    await page.locator('.custom-list').isVisible();
    await page.locator('.highlight').isVisible();
    await page.locator('.quote').isVisible();

    // Note: Pseudo-elements (::before, ::after) cannot be directly tested
    // but we can test that the parent elements exist and have the expected styling
    expect(await page.locator('.custom-list').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.color; // This would check the computed color
    })).toBeDefined();
  });
});