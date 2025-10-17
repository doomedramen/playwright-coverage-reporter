import { test, expect } from '@playwright/test';

test.describe('Coverage Reporting - Dynamic DOM Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
  });

  test('should track coverage for dynamically created elements', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="app">
            <button id="add-element">Add Element</button>
            <button id="add-multiple">Add Multiple Elements</button>
            <button id="clear-all">Clear All</button>
            <div id="container"></div>
          </div>
          <script>
            let elementCount = 0;

            document.getElementById('add-element').addEventListener('click', () => {
              elementCount++;
              const div = document.createElement('div');
              div.className = 'dynamic-element';
              div.textContent = 'Dynamic Element ' + elementCount;
              div.addEventListener('click', () => {
                div.classList.toggle('selected');
              });
              document.getElementById('container').appendChild(div);
            });

            document.getElementById('add-multiple').addEventListener('click', () => {
              for (let i = 0; i < 3; i++) {
                elementCount++;
                const div = document.createElement('div');
                div.className = 'dynamic-element';
                div.textContent = 'Dynamic Element ' + elementCount;
                div.addEventListener('click', () => {
                  div.classList.toggle('selected');
                });
                document.getElementById('container').appendChild(div);
              }
            });

            document.getElementById('clear-all').addEventListener('click', () => {
              document.getElementById('container').innerHTML = '';
              elementCount = 0;
            });
          </script>
        </body>
      </html>
    `);

      // Initially no elements
      await expect(page.locator('#container')).toBeEmpty();

      // Add single element dynamically
      await page.click('#add-element');
      await expect(page.locator('#container .dynamic-element')).toBeVisible();
      await expect(page.locator('#container .dynamic-element')).toHaveText('Dynamic Element 1');

      // Add multiple elements
      await page.click('#add-multiple');
      await expect(page.locator('#container .dynamic-element')).toHaveCount(4);

      // Test interacting with dynamic elements
      await page.click('#container .dynamic-element:nth-child(2)');
      await expect(page.locator('#container .dynamic-element:nth-child(2)')).toContainClass('selected');

      await page.click('#container .dynamic-element:last-child');
      await expect(page.locator('#container .dynamic-element:last-child')).toContainClass('selected');

      // Clear all elements
      await page.click('#clear-all');
      await expect(page.locator('#container')).toBeEmpty();
    });

    test('should track coverage for elements that appear conditionally', async ({ page }) => {
      await page.setContent(`
      <html>
        <body>
          <div id="app">
            <input type="checkbox" id="show-details">Show Details</input>
            <input type="text" id="username" placeholder="Enter username">
            <div id="conditional-section" style="display: none;">
              <h3>User Details</h3>
              <div id="user-info"></div>
              <button id="save-info">Save</button>
              <button id="clear-info">Clear</button>
            </div>
            <div id="error-section" style="display: none;">
              <p class="error">Please enter a username first</p>
              <button id="dismiss-error">Dismiss</button>
            </div>
            <div id="success-section" style="display: none;">
              <p class="success">Information saved successfully!</p>
            </div>
          </div>
          <script>
            document.getElementById('show-details').addEventListener('change', (e) => {
              const conditionalSection = document.getElementById('conditional-section');
              conditionalSection.style.display = e.target.checked ? 'block' : 'none';
            });

            document.getElementById('save-info').addEventListener('click', () => {
              const username = document.getElementById('username').value.trim();
              const errorSection = document.getElementById('error-section');
              const successSection = document.getElementById('success-section');
              const userInfo = document.getElementById('user-info');

              if (!username) {
                errorSection.style.display = 'block';
                successSection.style.display = 'none';
              } else {
                errorSection.style.display = 'none';
                userInfo.textContent = 'Username: ' + username;
                successSection.style.display = 'block';
              }
            });

            document.getElementById('clear-info').addEventListener('click', () => {
              document.getElementById('user-info').textContent = '';
              document.getElementById('success-section').style.display = 'none';
              document.getElementById('username').value = '';
            });

            document.getElementById('dismiss-error').addEventListener('click', () => {
              document.getElementById('error-section').style.display = 'none';
            });
          </script>
        </body>
      </html>
    `);

      // Initially only checkbox is visible
      await expect(page.locator('#conditional-section')).not.toBeVisible();
      await page.locator('#show-details').check();
      await expect(page.locator('#conditional-section')).toBeVisible();

      // Test without username - should show error
      await page.click('#save-info');
      await expect(page.locator('#error-section')).toBeVisible();
      await expect(page.locator('#error-section .error')).toHaveText('Please enter a username first');
      await page.click('#dismiss-error');

      // Enter username and save
      await page.fill('#username', 'testuser');
      await page.click('#save-info');
      await expect(page.locator('#success-section')).toBeVisible();
      await expect(page.locator('#success-section .success')).toHaveText('Information saved successfully!');
      await expect(page.locator('#user-info')).toHaveText('Username: testuser');

      // Clear information
      await page.click('#clear-info');
      await expect(page.locator('#user-info')).toBeEmpty();
      await expect(page.locator('#success-section')).not.toBeVisible();

      // Hide details
      await page.locator('#show-details').uncheck();
      await expect(page.locator('#conditional-section')).not.toBeVisible();
    });

    test('should track coverage for elements with delayed appearance', async ({ page }) => {
      await page.setContent(`
      <html>
        <body>
          <div id="app">
            <button id="trigger-loading">Load Content</button>
            <div id="loading" style="display: none;">Loading...</div>
            <div id="content" style="display: none;">
              <h2>Loaded Content</h2>
              <div id="delayed-element" style="display: none;">Appears after delay</div>
              <button id="trigger-delayed">Show Delayed Element</button>
              <input type="text" id="input-field" placeholder="Enter text">
            </div>
          </div>
          <script>
            document.getElementById('trigger-loading').addEventListener('click', () => {
              const loading = document.getElementById('loading');
              const content = document.getElementById('content');

              // Show loading
              loading.style.display = 'block';
              content.style.display = 'none';

              // Simulate loading delay
              setTimeout(() => {
                loading.style.display = 'none';
                content.style.display = 'block';
              }, 1000);
            });

            document.getElementById('trigger-delayed').addEventListener('click', () => {
              const delayedElement = document.getElementById('delayed-element');

              // Simulate delayed appearance
              setTimeout(() => {
                delayedElement.style.display = 'block';
              }, 500);
            });
          </script>
        </body>
      </html>
    `);

      // Test loading state
      await page.click('#trigger-loading');
      await expect(page.locator('#loading')).toBeVisible();
      await expect(page.locator('#content')).not.toBeVisible();

      // Wait for content to appear (simulated delay)
      await page.waitForTimeout(1000);
      await expect(page.locator('#content')).toBeVisible();
      await expect(page.locator('#loading')).not.toBeVisible();

      // Test delayed element
      await page.click('#trigger-delayed');
      await page.waitForTimeout(500);
      await expect(page.locator('#delayed-element')).toBeVisible();
      await page.fill('#input-field', 'Test text');
      await expect(page.locator('#input-field')).toHaveValue('Test text');
    });

    test('should track coverage for elements that change attributes dynamically', async ({ page }) => {
      await page.setContent(`
      <html>
        <body>
          <div id="app">
            <button id="toggle-visibility">Toggle Visibility</button>
            <button id="toggle-enabled">Toggle Enabled State</button>
            <button id="change-text">Change Text</button>
            <button id="toggle-class">Toggle CSS Class</button>
            <div id="dynamic-element" class="initial">
              <span id="text-content">Initial Text</span>
            </div>
            <input type="text" id="input-field" value="Initial Value">
          </div>
          <script>
            let isVisible = true;
            document.getElementById('toggle-visibility').addEventListener('click', () => {
              const element = document.getElementById('dynamic-element');
              isVisible = !isVisible;
              element.style.display = isVisible ? 'block' : 'none';
            });

            let isEnabled = true;
            document.getElementById('toggle-enabled').addEventListener('click', () => {
              const input = document.getElementById('input-field');
              isEnabled = !isEnabled;
              input.disabled = !isEnabled;
            });

            let textIndex = 0;
            document.getElementById('change-text').addEventListener('click', () => {
              const textContent = document.getElementById('text-content');
              textIndex = (textIndex + 1) % 2;
              textContent.textContent = textIndex === 0 ? 'Initial Text' : 'Updated Text';
            });

            document.getElementById('toggle-class').addEventListener('click', () => {
              const element = document.getElementById('dynamic-element');
              if (element.classList.contains('initial')) {
                element.classList.remove('initial');
                element.classList.add('updated');
              } else {
                element.classList.remove('updated');
                element.classList.add('initial');
              }
            });
          </script>
        </body>
      </html>
    `);

      const dynamicElement = page.locator('#dynamic-element');
      const textContent = page.locator('#text-content');
      const inputField = page.locator('#input-field');

      // Initial state
      await expect(dynamicElement).toBeVisible();
      await expect(dynamicElement).toHaveClass('initial');
      await expect(textContent).toHaveText('Initial Text');
      await expect(inputField).toHaveValue('Initial Value');
      await expect(inputField).toBeEnabled();

      // Toggle visibility
      await page.click('#toggle-visibility');
      await expect(dynamicElement).not.toBeVisible();

      await page.click('#toggle-visibility');
      await expect(dynamicElement).toBeVisible();

      // Toggle enabled state
      await page.click('#toggle-enabled');
      await expect(inputField).toBeDisabled();

      await page.click('#toggle-enabled');
      await expect(inputField).toBeEnabled();

      // Change text
      await page.click('#change-text');
      await expect(textContent).toHaveText('Updated Text');

      // Toggle CSS class
      await page.click('#toggle-class');
      await expect(dynamicElement).toContainClass('updated');
      await expect(dynamicElement).not.toContainClass('initial');

      // Change input value
      await page.fill('#input-field', 'Updated Value');
      await expect(inputField).toHaveValue('Updated Value');
    });

    test('should track coverage for form validation interactions', async ({ page }) => {
      await page.setContent(`
      <html>
        <body>
          <form id="validation-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required>
              <span class="error" id="email-error" style="display: none;">Please enter a valid email</span>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required minlength="8">
              <span class="error" id="password-error" style="display: none;">Password must be at least 8 characters</span>
              <span class="error" id="password-length-error" style="display: none;">Password is too short</span>
            </div>
            <div class="form-group">
              <label for="confirm-password">Confirm Password</label>
              <input type="password" id="confirm-password" name="confirm-password" required>
              <span class="error" id="confirm-error" style="display: none;">Passwords do not match</span>
            </div>
            <div class="form-group">
              <label for="age">Age</label>
              <input type="number" id="age" name="age" min="18" max="100">
              <span class="error" id="age-error" style="display: none;">Age must be between 18 and 100</span>
            </div>
            <div class="form-group">
              <label for="terms">
                <input type="checkbox" id="terms" name="terms" required>
                I agree to the terms and conditions
              </label>
              <span class="error" id="terms-error" style="display: none;">You must agree to the terms</span>
            </div>
            <button type="submit" id="submit">Submit Form</button>
            <div id="success-message" style="display: none;">Form submitted successfully!</div>
          </form>
          <script>
            const form = document.getElementById('validation-form');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const ageInput = document.getElementById('age');
            const termsCheckbox = document.getElementById('terms');

            function validateEmail(email) {
              const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
              return emailRegex.test(email);
            }

            function showError(errorId) {
              document.getElementById(errorId).style.display = 'block';
            }

            function hideError(errorId) {
              document.getElementById(errorId).style.display = 'none';
            }

            // Email validation
            emailInput.addEventListener('blur', () => {
              if (emailInput.value && !validateEmail(emailInput.value)) {
                showError('email-error');
              } else {
                hideError('email-error');
              }
            });

            // Password validation
            passwordInput.addEventListener('blur', () => {
              if (passwordInput.value.length > 0 && passwordInput.value.length < 8) {
                showError('password-length-error');
              } else {
                hideError('password-length-error');
              }
            });

            // Confirm password validation
            confirmPasswordInput.addEventListener('blur', () => {
              if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
                showError('confirm-error');
              } else {
                hideError('confirm-error');
              }
            });

            // Age validation
            ageInput.addEventListener('blur', () => {
              const age = parseInt(ageInput.value);
              if (ageInput.value && (age < 18 || age > 100)) {
                showError('age-error');
              } else {
                hideError('age-error');
              }
            });

            // Terms validation
            termsCheckbox.addEventListener('change', () => {
              if (termsCheckbox.checked) {
                hideError('terms-error');
              } else {
                showError('terms-error');
              }
            });

            // Also handle submit button click directly
            document.getElementById('submit').addEventListener('click', (e) => {
              e.preventDefault();
              form.dispatchEvent(new Event('submit'));
            });

            // Form submission
            form.addEventListener('submit', (e) => {
              e.preventDefault();

              let isValid = true;

              // Validate email
              if (!emailInput.value || !validateEmail(emailInput.value)) {
                showError('email-error');
                isValid = false;
              }

              // Validate password
              if (!passwordInput.value) {
                showError('password-error');
                isValid = false;
              } else if (passwordInput.value.length < 8) {
                showError('password-length-error');
                isValid = false;
              }

              // Validate confirm password
              if (!confirmPasswordInput.value || passwordInput.value !== confirmPasswordInput.value) {
                showError('confirm-error');
                isValid = false;
              }

              // Validate age
              const age = parseInt(ageInput.value);
              if (!ageInput.value || age < 18 || age > 100) {
                showError('age-error');
                isValid = false;
              }

              // Validate terms
              if (!termsCheckbox.checked) {
                showError('terms-error');
                isValid = false;
              } else {
                hideError('terms-error');
              }

              // Show success message if valid
              if (isValid) {
                document.getElementById('success-message').style.display = 'block';
                // Hide all error messages
                ['email-error', 'password-error', 'password-length-error', 'confirm-error', 'age-error', 'terms-error'].forEach(hideError);
              }
            });
          </script>
        </body>
      </html>
    `);

      const emailInput = page.locator('#email');
      const passwordInput = page.locator('#password');
      const confirmPasswordInput = page.locator('#confirm-password');
      const ageInput = page.locator('#age');
      const termsCheckbox = page.locator('#terms');
      const submitButton = page.locator('#submit');

      // Test empty form submission (should show errors)
      await submitButton.click();
      await expect(page.locator('#email-error')).toBeVisible();
      await expect(page.locator('#password-error')).toBeVisible();
      await expect(page.locator('#age-error')).toBeVisible();
      await expect(page.locator('#terms-error')).toBeVisible();

      // Test invalid email
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await expect(page.locator('#email-error')).toBeVisible();

      await emailInput.fill('user@example.com');
      await emailInput.blur();
      await expect(page.locator('#email-error')).not.toBeVisible();

      // Test short password
      await passwordInput.fill('123');
      await passwordInput.blur();
      await expect(page.locator('#password-length-error')).toBeVisible();

      await passwordInput.fill('validpassword123');
      await passwordInput.blur();
      await expect(page.locator('#password-length-error')).not.toBeVisible();

      // Test password mismatch
      await confirmPasswordInput.fill('differentpassword');
      await confirmPasswordInput.blur();
      await expect(page.locator('#confirm-error')).toBeVisible();

      await confirmPasswordInput.fill('validpassword123');
      await confirmPasswordInput.blur();
      await expect(page.locator('#confirm-error')).not.toBeVisible();

      // Test invalid age
      await ageInput.fill('15');
      await ageInput.blur();
      await expect(page.locator('#age-error')).toBeVisible();

      await ageInput.fill('25');
      await ageInput.blur();
      await expect(page.locator('#age-error')).not.toBeVisible();

      // Test terms checkbox
      await termsCheckbox.check();
      await termsCheckbox.uncheck();
      await expect(page.locator('#terms-error')).toBeVisible();

      await termsCheckbox.check();
      expect(page.locator('#terms-error')).not.toBeVisible();

      // Test successful submission
      await submitButton.click();
      await expect(page.locator('#success-message')).toBeVisible();
    });

    test('should track coverage for nested element interactions', async ({ page }) => {
      await page.setContent(`
      <html>
        <body>
          <div id="app">
            <div class="accordion">
              <div class="accordion-item">
                <button class="accordion-header">Section 1</button>
                <div class="accordion-content" style="display: none;">
                  <p>Section 1 content</p>
                  <button class="action-btn">Action 1</button>
                </div>
              </div>
              <div class="accordion-item">
                <button class="accordion-header">Section 2</button>
                <div class="accordion-content" style="display: none;">
                  <p>Section 2 content</p>
                  <button class="action-btn">Action 2</button>
                </div>
              </div>
              <div class="accordion-item">
                <button class="accordion-header">Section 3</button>
                <div class="accordion-content" style="display: none;">
                  <p>Section 3 content</p>
                  <button class="action-btn">Action 3</button>
                </div>
              </div>
            </div>

            <div class="tabs">
              <button class="tab active" data-tab="tab1">Tab 1</button>
              <button class="tab" data-tab="tab2">Tab 2</button>
              <button class="tab" data-tab="tab3">Tab 3</button>

              <div class="tab-content active" id="tab1">
                <p>Tab 1 content</p>
                <input type="text" class="tab-input" placeholder="Tab 1 input">
              </div>
              <div class="tab-content" id="tab2" style="display: none;">
                <p>Tab 2 content</p>
                <input type="text" class="tab-input" placeholder="Tab 2 input">
              </div>
              <div class="tab-content" id="tab3" style="display: none;">
                <p>Tab 3 content</p>
                <input type="text" class="tab-input" placeholder="Tab 3 input">
              </div>
            </div>

            <div class="tree">
              <ul>
                <li>
                  <span class="tree-toggle">▶</span>
                  <span class="tree-label">Root Node</span>
                  <ul style="display: none;">
                    <li>
                      <span class="tree-toggle">▶</span>
                      <span class="tree-label">Child 1</span>
                      <ul style="display: none;">
                        <li><span class="tree-leaf">Leaf 1.1</span></li>
                        <li><span class="tree-leaf">Leaf 1.2</span></li>
                      </ul>
                    </li>
                    <li>
                      <span class="tree-toggle">▶</span>
                      <span class="tree-label">Child 2</span>
                      <ul style="display: none;">
                        <li><span class="tree-leaf">Leaf 2.1</span></li>
                        <li><span class="tree-leaf">Leaf 2.2</span></li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
          <script>
            // Accordion functionality
            document.querySelectorAll('.accordion-header').forEach(header => {
              header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isVisible = content.style.display === 'block';

                // Toggle current accordion
                content.style.display = isVisible ? 'none' : 'block';
              });
            });

            // Action buttons functionality
            document.querySelectorAll('.action-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                btn.classList.add('clicked');
              });
            });

            // Tab functionality
            document.querySelectorAll('.tab').forEach(tab => {
              tab.addEventListener('click', () => {
                const targetTabId = tab.getAttribute('data-tab');

                // Remove active class from all tabs and contents
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => {
                  content.classList.remove('active');
                  content.style.display = 'none';
                });

                // Add active class to clicked tab and show corresponding content
                tab.classList.add('active');
                const targetContent = document.getElementById(targetTabId);
                if (targetContent) {
                  targetContent.classList.add('active');
                  targetContent.style.display = 'block';
                }
              });
            });

            // Tree toggle functionality
            document.querySelectorAll('.tree-toggle').forEach(toggle => {
              toggle.addEventListener('click', () => {
                const childList = toggle.parentElement.querySelector('ul');
                if (childList) {
                  const isVisible = childList.style.display === 'block';
                  childList.style.display = isVisible ? 'none' : 'block';
                  toggle.textContent = isVisible ? '▶' : '▼';
                }
              });
            });

            // Tree leaf functionality
            document.querySelectorAll('.tree-leaf').forEach(leaf => {
              leaf.addEventListener('click', () => {
                // Simple highlight functionality for tree leaves
                document.querySelectorAll('.tree-leaf').forEach(l => l.style.backgroundColor = '');
                leaf.style.backgroundColor = '#e3f2fd';
              });
            });
          </script>
        </body>
      </html>
    `);

      // Test accordion interactions
      await page.click('.accordion-item:first-child .accordion-header'); // Section 1
      await expect(page.locator('.accordion-item:first-child .accordion-content')).toBeVisible();
      await page.click('.accordion-item:first-child .action-btn');
      await expect(page.locator('.accordion-item:first-child .action-btn')).toContainClass('clicked');

      await page.click('.accordion-item:nth-child(2) .accordion-header'); // Section 2
      await expect(page.locator('.accordion-item:nth-child(2) .accordion-content')).toBeVisible();
      await page.click('.accordion-item:nth-child(2) .action-btn');

      await page.click('.accordion-item:nth-child(3) .accordion-header'); // Section 3
      await expect(page.locator('.accordion-item:nth-child(3) .accordion-content')).toBeVisible();
      await page.click('.accordion-item:nth-child(3) .action-btn');

      // Test tab interactions
      await page.click('[data-tab="tab2"]');
      await expect(page.locator('#tab2')).toBeVisible();
      await expect(page.locator('#tab1')).not.toBeVisible();
      await page.fill('#tab2 .tab-input', 'Tab 2 value');

      await page.click('[data-tab="tab3"]');
      await expect(page.locator('#tab3')).toBeVisible();
      await expect(page.locator('#tab2')).not.toBeVisible();
      await page.fill('#tab3 .tab-input', 'Tab 3 value');

      // Test tree interactions
      await page.click('.tree > ul > li:first-child > .tree-toggle'); // Root node
      await expect(page.locator('.tree > ul > li:first-child > .tree-toggle')).toHaveText('▼'); // Toggle to expanded
      await expect(page.locator('.tree > ul > li:first-child > ul')).toBeVisible();

      await page.click('.tree > ul > li:first-child > ul > li:first-child > .tree-toggle'); // Child 1
      await expect(page.locator('.tree > ul > li:first-child > ul > li:first-child > .tree-toggle')).toHaveText('▼');
      await page.click('.tree > ul > li:first-child > ul > li:first-child > ul > li:first-child .tree-leaf'); // Leaf 1.1

      await page.click('.tree > ul > li:first-child > ul > li:nth-child(2) > .tree-toggle'); // Child 2
      await page.click('.tree > ul > li:first-child > ul > li:nth-child(2) > ul > li:nth-child(2) .tree-leaf'); // Leaf 2.2
    });

    test('should track coverage for drag and drop interactions', async ({ page }) => {
      await page.setContent(`
        <html>
        <body>
          <div id="app">
            <div class="drag-source">
              <div class="draggable" id="item1" draggable="true">Item 1</div>
              <div class="draggable" id="item2" draggable="true">Item 2</div>
              <div class="draggable" id="item3" draggable="true">Item 3</div>
            </div>
            <div class="drop-zones">
              <div class="drop-zone" id="zone1" data-zone="zone1">
                <p>Drop Zone 1</p>
              </div>
              <div class="drop-zone" id="zone2" data-zone="zone2">
                <p>Drop Zone 2</p>
              </div>
              <div class="drop-zone" id="zone3" data-zone="zone3">
                <p>Drop Zone 3</p>
              </div>
            </div>
            <div class="drag-target">
              <div class="target-area" id="target1">Target 1</div>
              <div class="target-area" id="target2">Target 2</div>
            </div>
          </div>
          <script>
            let draggedElement = null;
            let originalParent = null;

            // Handle drag start
            document.querySelectorAll('.draggable').forEach(item => {
              item.addEventListener('dragstart', (e) => {
                draggedElement = e.target;
                originalParent = e.target.parentElement;
                e.target.style.opacity = '0.5';
              });

              item.addEventListener('dragend', (e) => {
                e.target.style.opacity = '';
              });
            });

            // Handle drop zones
            document.querySelectorAll('.drop-zone').forEach(zone => {
              zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.style.backgroundColor = '#e3f2fd';
              });

              zone.addEventListener('dragleave', (e) => {
                zone.style.backgroundColor = '';
              });

              zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.style.backgroundColor = '';

                if (draggedElement) {
                  // Remove existing p tag if exists
                  const existingP = zone.querySelector('p');
                  if (existingP) {
                    existingP.remove();
                  }

                  // Clone and append the dragged element
                  const clone = draggedElement.cloneNode(true);
                  clone.id = draggedElement.id; // Keep same ID for testing
                  zone.appendChild(clone);

                  // Re-attach drag event listeners to the new clone
                  clone.addEventListener('dragstart', (e) => {
                    draggedElement = e.target;
                    originalParent = e.target.parentElement;
                    e.target.style.opacity = '0.5';
                  });

                  clone.addEventListener('dragend', (e) => {
                    e.target.style.opacity = '';
                  });

                  // Remove the original element from its original parent
                  if (originalParent && originalParent.contains(draggedElement)) {
                    draggedElement.remove();
                  }
                }
              });
            });

            // Handle target areas
            document.querySelectorAll('.target-area').forEach(target => {
              target.addEventListener('dragover', (e) => {
                e.preventDefault();
                target.style.backgroundColor = '#c8e6c9';
              });

              target.addEventListener('dragleave', (e) => {
                target.style.backgroundColor = '';
              });

              target.addEventListener('drop', (e) => {
                e.preventDefault();
                target.style.backgroundColor = '';
                target.textContent = ''; // Clear target text

                if (draggedElement) {
                  // Clone and append the dragged element
                  const clone = draggedElement.cloneNode(true);
                  target.appendChild(clone);

                  // Re-attach drag event listeners to the new clone
                  clone.addEventListener('dragstart', (e) => {
                    draggedElement = e.target;
                    originalParent = e.target.parentElement;
                    e.target.style.opacity = '0.5';
                  });

                  clone.addEventListener('dragend', (e) => {
                    e.target.style.opacity = '';
                  });

                  // Remove all elements with the same ID except the one we just added
                  const allElementsWithId = document.querySelectorAll('#' + draggedElement.id);
                  allElementsWithId.forEach(element => {
                    if (element !== clone) {
                      element.remove();
                    }
                  });
                }
              });
            });

            // Handle drag source (for returning items)
            document.querySelector('.drag-source').addEventListener('dragover', (e) => {
              e.preventDefault();
              e.currentTarget.style.backgroundColor = '#ffecb3';
            });

            document.querySelector('.drag-source').addEventListener('dragleave', (e) => {
              e.currentTarget.style.backgroundColor = '';
            });

            document.querySelector('.drag-source').addEventListener('drop', (e) => {
              e.preventDefault();
              e.currentTarget.style.backgroundColor = '';

              if (draggedElement) {
                // Clone and append back to source
                const clone = draggedElement.cloneNode(true);
                e.currentTarget.appendChild(clone);

                // Remove all elements with the same ID except the one we just added
                const allElementsWithId = document.querySelectorAll('#' + draggedElement.id);
                allElementsWithId.forEach(element => {
                  if (element !== clone) {
                    element.remove();
                  }
                });
              }
            });
          </script>
        </body>
      </html>
      `);

      // Test drag and drop between drop zones
      await page.dragAndDrop('#item1', '#zone2');
      await expect(page.locator('.drag-source .draggable')).toHaveCount(2); // item1 removed from source
      await expect(page.locator('#zone2 .draggable')).toHaveCount(1);
      await expect(page.locator('#zone2 #item1')).toBeVisible();

      await page.dragAndDrop('#item2', '#zone3');
      await expect(page.locator('#zone2 .draggable')).toHaveCount(1); // item1 still there
      await expect(page.locator('#zone3 .draggable')).toHaveCount(1);
      await expect(page.locator('#zone3 #item2')).toBeVisible();

      await page.dragAndDrop('#item3', '#zone1');
      await expect(page.locator('#zone1')).not.toContainText('Drop Zone 1'); // original p tag removed
      await expect(page.locator('#zone1 .draggable')).toHaveCount(1);
      await expect(page.locator('#zone3 .draggable')).toHaveCount(1); // item2 still there
      await expect(page.locator('#zone1 #item3')).toBeVisible();

      // Test drag and drop to target areas
      await page.dragAndDrop('#zone2 #item1', '#target1');
      await expect(page.locator('#zone2 .draggable')).toHaveCount(0);
      await expect(page.locator('#target1 .draggable')).toHaveCount(1);

      await page.dragAndDrop('#zone3 #item2', '#target2');
      await expect(page.locator('#zone3 .draggable')).toHaveCount(0);
      await expect(page.locator('#target2 .draggable')).toHaveCount(1);

      // Final state check - verify all elements are in their expected locations
      await expect(page.locator('#zone1 .draggable')).toHaveCount(1); // item3
      await expect(page.locator('#zone2 .draggable')).toHaveCount(0); // item1 moved to target
      await expect(page.locator('#zone3 .draggable')).toHaveCount(0); // item2 moved to target
      await expect(page.locator('#target1 .draggable')).toHaveCount(1); // item1
      await expect(page.locator('#target2 .draggable')).toHaveCount(1); // item2
    });

    test('should track coverage for keyboard navigation interactions', async ({ page }) => {
      await page.setContent(`
      <html>
        <body>
          <div id="app">
            <button id="button1">Button 1</button>
            <button id="button2">Button 2</button>
            <button id="button3">Button 3</button>
            <button id="button4">Button 4</button>
            <button id="button5">Button 5</button>

            <input type="text" id="input1" value="">
            <input type="text" id="input2" value="">
            <input type="text" id="input3" value="">

            <div id="focus-trap" tabindex="0">
              <p>This is a focus trap for keyboard navigation</p>
              <button id="trap-button1">Trap Button 1</button>
              <button id="trap-button2">Trap Button 2</button>
              <button id="exit-trap">Exit Focus Trap</button>
            </div>
          </div>
          <script>
            // Custom arrow key navigation for buttons
            const buttons = Array.from(document.querySelectorAll('button:not(#trap-button1):not(#trap-button2):not(#exit-trap)'));
            const inputs = Array.from(document.querySelectorAll('input'));
            const trapButtons = Array.from(document.querySelectorAll('#trap-button1, #trap-button2, #exit-trap'));

            let currentButtonIndex = -1;

            // Initialize currentButtonIndex when a button gets focus
            buttons.forEach((button, index) => {
              button.addEventListener('focus', () => {
                currentButtonIndex = index;
              });
            });

            // Set up initial keyboard navigation
            document.addEventListener('keydown', (e) => {
              // Only handle arrow navigation when a button is focused
              if (document.activeElement && buttons.includes(document.activeElement)) {
                // Arrow key navigation between buttons
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  currentButtonIndex = (currentButtonIndex + 1) % buttons.length;
                  buttons[currentButtonIndex].focus();
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                  buttons[currentButtonIndex].focus();
                }
              }

              // Escape key to exit focus trap
              if (e.key === 'Escape' && document.activeElement?.id === 'exit-trap') {
                e.preventDefault();
                document.getElementById('button1').focus();
              }
            });
          </script>
        </body>
      </html>
      `);

      // Test keyboard navigation with Tab
      await page.keyboard.press('Tab');
      await expect(page.locator('#button1')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('#button2')).toBeFocused();

      // Test arrow navigation through buttons
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#button3')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#button4')).toBeFocused();

      // Test shift+Tab for backward navigation
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('#button3')).toBeFocused();

      // Tab to inputs
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('#input1')).toBeFocused();

      // Fill inputs using keyboard
      await page.keyboard.type('Input 1 value');
      await expect(page.locator('#input1')).toHaveValue('Input 1 value');

      await page.keyboard.press('Tab');
      await page.keyboard.type('Input 2 value');
      await expect(page.locator('#input2')).toHaveValue('Input 2 value');

      // Test focus trap - Tab into it (first button should be focused)
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('#trap-button1')).toBeFocused();

      // Navigate within focus trap
      await page.keyboard.press('Tab');
      await expect(page.locator('#trap-button2')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('#exit-trap')).toBeFocused();

      // Exit focus trap using Escape key and continue navigation
      await page.keyboard.press('Escape');
      await expect(page.locator('#button1')).toBeFocused();
    });
});