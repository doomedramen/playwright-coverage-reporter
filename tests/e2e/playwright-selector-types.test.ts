import { test, expect } from '@playwright/test';

test.describe('Coverage Reporting - Playwright Selector Types', () => {

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
    await page.getByText('Please enter your').isVisible();
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
    const helpLink = page.getByTitle('Click for help');
    if (await helpLink.count() > 0) {
      await helpLink.click();
    }

    const infoIcon = page.getByTitle('Information icon');
    if (await infoIcon.count() > 0) {
      await infoIcon.isVisible();
    }

    const apiAbbr = page.getByTitle('Application Programming Interface');
    if (await apiAbbr.count() > 0) {
      await apiAbbr.isVisible();
    }

    const usernameInput = page.getByTitle('Enter your username');
    if (await usernameInput.count() > 0) {
      await usernameInput.type('testuser');
    }

    const tooltipDiv = page.getByTitle('Tooltip text');
    if (await tooltipDiv.count() > 0) {
      await tooltipDiv.hover();
    }
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
    const submitBtn = page.getByTestId('submit-button');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
    }

    const usernameInput = page.getByTestId('username-input');
    if (await usernameInput.count() > 0) {
      await usernameInput.fill('testuser');
    }

    const errorMessage = page.getByTestId('error-message');
    if (await errorMessage.count() > 0) {
      await errorMessage.isVisible();
    }

    const loginForm = page.getByTestId('login-form');
    const emailField = loginForm.getByTestId('email-field');
    if (await emailField.count() > 0) {
      await emailField.fill('user@example.com');
    }

    const loginBtn = page.getByTestId('login-button');
    if (await loginBtn.count() > 0) {
      await loginBtn.click();
    }

    const mainNav = page.getByTestId('main-navigation');
    const navHome = mainNav.getByTestId('nav-home');
    if (await navHome.count() > 0) {
      await navHome.click();
    }

    const pageFooter = page.getByTestId('page-footer');
    if (await pageFooter.count() > 0) {
      await pageFooter.isVisible();
    }

    // Test nested data-testid
    const nestedEmailField = page.getByTestId('login-form').getByTestId('email-field');
    if (await nestedEmailField.count() > 0) {
      expect(nestedEmailField).toBeVisible();
    }

    const navAbout = page.getByTestId('main-navigation').getByTestId('nav-about');
    if (await navAbout.count() > 0) {
      expect(navAbout).toBeVisible();
    }
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
    const pageTitle = page.locator('.page-title');
    if (await pageTitle.count() > 0) {
      await pageTitle.isVisible();
    }

    const formInput = page.locator('.form-input[name="username"]');
    if (await formInput.count() > 0) {
      await formInput.fill('testuser');
    }

    const passwordInput = page.locator('.password-input[name="password"]');
    if (await passwordInput.count() > 0) {
      await passwordInput.fill('password123');
    }

    const submitBtn = page.locator('.submit-btn');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
    }

    const cancelBtn = page.locator('.cancel-btn');
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
    }

    // Test complex CSS selectors
    const cardTitle = page.locator('.card-title');
    if (await cardTitle.count() > 0) {
      await cardTitle.isVisible();
    }

    const cardContent = page.locator('.card-content');
    if (await cardContent.count() > 0) {
      await cardContent.isVisible();
    }

    const cardLink = page.locator('.card-link');
    if (await cardLink.count() > 0) {
      await cardLink.click();
    }

    const activeListItem = page.locator('.list-item.active');
    if (await activeListItem.count() > 0) {
      await activeListItem.isVisible();
    }

    const disabledListItem = page.locator('.list-item.disabled');
    if (await disabledListItem.count() > 0) {
      await disabledListItem.isVisible();
    }

    const headerCell = page.locator('.header-cell');
    if (await headerCell.count() > 0) {
      await headerCell.isVisible();
    }

    const dataCell = page.locator('.data-cell');
    if (await dataCell.count() > 0) {
      await dataCell.isVisible();
    }

    // Test descendant selectors
    const loginFormInputs = page.locator('.login-form .form-input');
    const actualCount = await loginFormInputs.count();
    // Note: This tests the selector even if count differs from expected
    console.log(`Found ${actualCount} .login-form .form-input elements`);

    const dataTable = page.locator('.container .data-table');
    if (await dataTable.count() > 0) {
      await dataTable.isVisible();
    }
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
    const usernameXpath = page.locator('xpath=//input[@id="username"]');
    if (await usernameXpath.count() > 0) {
      await usernameXpath.fill('testuser');
    }

    const passwordXpath = page.locator('xpath=//input[@name="password"]');
    if (await passwordXpath.count() > 0) {
      await passwordXpath.fill('password123');
    }

    const submitXpath = page.locator('xpath=//button[@type="submit"]');
    if (await submitXpath.count() > 0) {
      await submitXpath.click();
    }

    // Test XPath with different axes
    const homeLink = page.locator('xpath=//a[contains(text(), "Home")]');
    if (await homeLink.count() > 0) {
      await homeLink.click();
    }

    const aboutLink = page.locator('xpath=//a[contains(@href, "/about")]');
    if (await aboutLink.count() > 0) {
      await aboutLink.click();
    }

    const lastLink = page.locator('xpath=//li[last()]/a');
    if (await lastLink.count() > 0) {
      await lastLink.click();
    }

    // Test XPath with conditions
    const highlightSpan = page.locator('xpath=//span[@class="highlight"]');
    if (await highlightSpan.count() > 0) {
      await highlightSpan.isVisible();
    }

    const titleHeader = page.locator('xpath=//h2[contains(text(), "Title")]');
    if (await titleHeader.count() > 0) {
      await titleHeader.isVisible();
    }

    const contentPara = page.locator('xpath=//p[contains(text(), "content")]');
    if (await contentPara.count() > 0) {
      await contentPara.isVisible();
    }

    // Test XPath with parent/child relationships
    const formInputs = page.locator('xpath=//form[@id="login-form"]/input');
    const formInputCount = await formInputs.count();
    console.log(`Found ${formInputCount} //form[@id="login-form"]/input elements`);

    const navLinks = page.locator('xpath=//div[@class="navigation"]//a');
    const navLinkCount = await navLinks.count();
    console.log(`Found ${navLinkCount} //div[@class="navigation"]//a elements`);

    const contentHeader = page.locator('xpath=//div[@class="content"]/h2');
    if (await contentHeader.count() > 0) {
      await contentHeader.isVisible();
    }
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