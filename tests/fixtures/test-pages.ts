import { Page } from '@playwright/test';

export class TestPages {
  /**
   * Creates a comprehensive login page with various element types
   */
  static async createLoginPage(page: Page): Promise<void> {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - Test Application</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
          .form-group { margin-bottom: 15px; }
          .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
          .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .form-group input.error { border-color: #dc3545; }
          .error-message { color: #dc3545; font-size: 14px; margin-top: 5px; display: none; }
          .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
          .btn-primary { background-color: #007bff; color: white; }
          .btn-secondary { background-color: #6c757d; color: white; }
          .checkbox-group { display: flex; align-items: center; gap: 8px; }
          .links { margin-top: 20px; text-align: center; }
          .links a { margin: 0 10px; }
          .social-login { margin-top: 20px; }
          .social-btn { width: 100%; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; background: white; cursor: pointer; }
          .success-message { background-color: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin-top: 15px; display: none; }
          .loading { display: none; text-align: center; margin-top: 10px; }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <main role="main">
          <h1>Login to Your Account</h1>
          <p>Please enter your credentials to access the application.</p>

          <form id="login-form" novalidate>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                required
                aria-describedby="email-error"
                autocomplete="email"
              >
              <div id="email-error" class="error-message" role="alert" aria-live="polite"></div>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                required
                aria-describedby="password-error"
                autocomplete="current-password"
              >
              <div id="password-error" class="error-message" role="alert" aria-live="polite"></div>
            </div>

            <div class="checkbox-group">
              <input type="checkbox" id="remember" name="remember">
              <label for="remember">Remember me for 30 days</label>
            </div>

            <div class="form-group">
              <button type="submit" class="btn btn-primary" id="login-btn">
                Login to Account
              </button>
              <button type="reset" class="btn btn-secondary" id="reset-btn">
                Clear Form
              </button>
            </div>

            <div class="loading" id="loading">
              <div aria-label="Loading">Logging in...</div>
            </div>

            <div class="success-message" id="success-message" role="status" aria-live="polite">
              Login successful! Redirecting...
            </div>
          </form>

          <div class="links">
            <a href="/forgot-password" id="forgot-password">Forgot Password?</a>
            <span>|</span>
            <a href="/register" id="register-link">Create Account</a>
          </div>

          <div class="social-login">
            <p>Or login with:</p>
            <button class="social-btn" data-provider="google" id="google-login">
              <span aria-hidden="true">🔵</span> Login with Google
            </button>
            <button class="social-btn" data-provider="github" id="github-login">
              <span aria-hidden="true">🐙</span> Login with GitHub
            </button>
            <button class="social-btn" data-provider="microsoft" id="microsoft-login">
              <span aria-hidden="true">🪟</span> Login with Microsoft
            </button>
          </div>
        </main>

        <footer>
          <p>&copy; 2024 Test Application. All rights reserved.</p>
          <nav aria-label="Footer navigation">
            <a href="/privacy">Privacy Policy</a> |
            <a href="/terms">Terms of Service</a>
          </nav>
        </footer>

        <script>
          // Form validation and interaction logic
          document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('email');
            const password = document.getElementById('password');
            const emailError = document.getElementById('email-error');
            const passwordError = document.getElementById('password-error');
            const loading = document.getElementById('loading');
            const successMessage = document.getElementById('success-message');

            // Reset errors
            emailError.style.display = 'none';
            passwordError.style.display = 'none';
            email.classList.remove('error');
            password.classList.remove('error');

            let isValid = true;

            // Validate email
            if (!email.value || !email.value.includes('@')) {
              emailError.textContent = 'Please enter a valid email address';
              emailError.style.display = 'block';
              email.classList.add('error');
              isValid = false;
            }

            // Validate password
            if (!password.value || password.value.length < 6) {
              passwordError.textContent = 'Password must be at least 6 characters';
              passwordError.style.display = 'block';
              password.classList.add('error');
              isValid = false;
            }

            if (isValid) {
              // Show loading
              loading.style.display = 'block';
              document.getElementById('login-btn').disabled = true;

              // Simulate API call
              setTimeout(() => {
                loading.style.display = 'none';
                successMessage.style.display = 'block';

                // Simulate redirect after success
                setTimeout(() => {
                  // Add a dynamic element that appears after login
                  const dynamicContent = document.createElement('div');
                  dynamicContent.id = 'dynamic-welcome';
                  dynamicContent.innerHTML = '<h2>Welcome back!</h2><p>You have successfully logged in.</p>';
                  dynamicContent.setAttribute('role', 'alert');
                  dynamicContent.setAttribute('aria-live', 'polite');
                  document.querySelector('main').appendChild(dynamicContent);
                }, 1000);
              }, 1500);
            }
          });

          // Reset button functionality
          document.getElementById('reset-btn').addEventListener('click', function() {
            document.getElementById('email-error').style.display = 'none';
            document.getElementById('password-error').style.display = 'none';
            document.getElementById('email').classList.remove('error');
            document.getElementById('password').classList.remove('error');
            document.getElementById('success-message').style.display = 'none';
          });

          // Social login buttons
          document.querySelectorAll('.social-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              const provider = this.getAttribute('data-provider');
              const message = document.createElement('div');
              message.className = 'success-message';
              message.style.display = 'block';
              message.textContent = \`Redirecting to \${provider} login...\`;
              message.setAttribute('role', 'status');
              document.querySelector('main').insertBefore(message, document.querySelector('.social-login'));
            });
          });
        </script>
      </body>
      </html>
    `);
  }

  /**
   * Creates a dashboard page with dynamic content and complex interactions
   */
  static async createDashboardPage(page: Page): Promise<void> {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - Test Application</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .header { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .user-info { display: flex; justify-content: space-between; align-items: center; }
          .user-profile { display: flex; align-items: center; gap: 10px; }
          .avatar { width: 40px; height: 40px; border-radius: 50%; background: #007bff; color: white; display: flex; align-items: center; justify-content: center; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
          .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .card h3 { margin-top: 0; }
          .stats { display: flex; justify-content: space-around; text-align: center; }
          .stat { flex: 1; }
          .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f2f2f2; }
          .btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
          .btn-primary { background-color: #007bff; color: white; }
          .btn-danger { background-color: #dc3545; color: white; }
          .dropdown { position: relative; display: inline-block; }
          .dropdown-content { display: none; position: absolute; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000; }
          .dropdown-content.show { display: block; }
          .dropdown-item { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; }
          .dropdown-item:hover { background-color: #f5f5f5; }
          .notification { position: fixed; top: 20px; right: 20px; background: white; padding: 15px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: none; z-index: 2000; }
          .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 3000; }
          .modal-content { background: white; margin: 50px auto; padding: 20px; border-radius: 8px; max-width: 500px; }
          .tabs { display: flex; border-bottom: 1px solid #ddd; }
          .tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
          .tab.active { border-bottom-color: #007bff; color: #007bff; }
          .tab-content { display: none; padding: 20px 0; }
          .tab-content.active { display: block; }
          .progress-bar { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
          .progress-fill { height: 100%; background: #28a745; transition: width 0.3s ease; }
        </style>
      </head>
      <body>
        <header class="header">
          <div class="user-info">
            <div class="user-profile">
              <div class="avatar" aria-label="User avatar">JD</div>
              <div>
                <div id="user-name" class="user-name">John Doe</div>
                <div id="user-email" class="user-email">john@example.com</div>
              </div>
            </div>
            <div class="dropdown">
              <button class="btn btn-primary" id="user-menu-btn" aria-label="User menu">
                ▼ Menu
              </button>
              <div class="dropdown-content" id="user-menu" role="menu">
                <div class="dropdown-item" role="menuitem" data-action="profile">Profile</div>
                <div class="dropdown-item" role="menuitem" data-action="settings">Settings</div>
                <div class="dropdown-item" role="menuitem" data-action="logout">Logout</div>
              </div>
            </div>
          </div>
        </header>

        <div class="grid">
          <div class="card">
            <h3>Statistics Overview</h3>
            <div class="stats">
              <div class="stat">
                <div class="stat-number" id="total-users">1,234</div>
                <div>Total Users</div>
              </div>
              <div class="stat">
                <div class="stat-number" id="active-projects">42</div>
                <div>Active Projects</div>
              </div>
              <div class="stat">
                <div class="stat-number" id="completion-rate">87%</div>
                <div>Completion Rate</div>
              </div>
            </div>
            <button class="btn btn-primary" id="refresh-stats" style="margin-top: 15px;">
              Refresh Statistics
            </button>
          </div>

          <div class="card">
            <h3>Quick Actions</h3>
            <div style="display: grid; gap: 10px;">
              <button class="btn btn-primary" id="new-project">Create New Project</button>
              <button class="btn btn-primary" id="invite-user">Invite Team Member</button>
              <button class="btn btn-primary" id="generate-report">Generate Report</button>
              <button class="btn btn-primary" id="view-analytics">View Analytics</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Project Management</h3>
          <div class="tabs">
            <div class="tab active" data-tab="active">Active Projects</div>
            <div class="tab" data-tab="completed">Completed</div>
            <div class="tab" data-tab="archived">Archived</div>
          </div>
          <div class="tab-content active" id="active-tab">
            <table class="table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="projects-table">
                <tr data-project-id="1">
                  <td>Website Redesign</td>
                  <td><span class="status-badge" data-status="active">Active</span></td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: 75%"></div>
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-primary edit-project" data-id="1">Edit</button>
                    <button class="btn btn-danger delete-project" data-id="1">Delete</button>
                  </td>
                </tr>
                <tr data-project-id="2">
                  <td>Mobile App Development</td>
                  <td><span class="status-badge" data-status="active">Active</span></td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: 45%"></div>
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-primary edit-project" data-id="2">Edit</button>
                    <button class="btn btn-danger delete-project" data-id="2">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <button class="btn btn-primary" id="load-more-projects">Load More Projects</button>
          </div>
          <div class="tab-content" id="completed-tab">
            <p>No completed projects yet.</p>
          </div>
          <div class="tab-content" id="archived-tab">
            <p>No archived projects yet.</p>
          </div>
        </div>

        <!-- Notification -->
        <div class="notification" id="notification" role="alert" aria-live="polite">
          <div id="notification-message"></div>
          <button class="btn" id="close-notification" style="margin-top: 10px;">Close</button>
        </div>

        <!-- Modal -->
        <div class="modal" id="project-modal" role="dialog" aria-modal="true">
          <div class="modal-content">
            <h3 id="modal-title">Edit Project</h3>
            <form id="project-form">
              <div class="form-group">
                <label for="project-name">Project Name</label>
                <input type="text" id="project-name" required>
              </div>
              <div class="form-group">
                <label for="project-status">Status</label>
                <select id="project-status">
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div class="form-group">
                <label for="project-progress">Progress (%)</label>
                <input type="number" id="project-progress" min="0" max="100">
              </div>
              <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn" id="cancel-modal">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <script>
          // User menu dropdown
          document.getElementById('user-menu-btn').addEventListener('click', function() {
            const menu = document.getElementById('user-menu');
            menu.classList.toggle('show');
          });

          // User menu actions
          document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function() {
              const action = this.getAttribute('data-action');
              showNotification(\`\${action.charAt(0).toUpperCase() + action.slice(1)} functionality would be implemented here\`);
              document.getElementById('user-menu').classList.remove('show');
            });
          });

          // Tab switching
          document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
              // Remove active class from all tabs and contents
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

              // Add active class to clicked tab and corresponding content
              this.classList.add('active');
              const tabName = this.getAttribute('data-tab');
              document.getElementById(\`\${tabName}-tab\`).classList.add('active');
            });
          });

          // Refresh statistics
          document.getElementById('refresh-stats').addEventListener('click', function() {
            // Simulate refreshing with random numbers
            document.getElementById('total-users').textContent = Math.floor(Math.random() * 2000 + 1000).toLocaleString();
            document.getElementById('active-projects').textContent = Math.floor(Math.random() * 50 + 20);
            document.getElementById('completion-rate').textContent = Math.floor(Math.random() * 20 + 80) + '%';

            showNotification('Statistics refreshed successfully!');
          });

          // Quick action buttons
          document.getElementById('new-project').addEventListener('click', () => {
            showNotification('Create new project form would appear here');
          });

          document.getElementById('invite-user').addEventListener('click', () => {
            showNotification('Invite user dialog would appear here');
          });

          document.getElementById('generate-report').addEventListener('click', () => {
            showNotification('Report generation started...');
          });

          document.getElementById('view-analytics').addEventListener('click', () => {
            showNotification('Analytics dashboard would open here');
          });

          // Project actions
          document.querySelectorAll('.edit-project').forEach(btn => {
            btn.addEventListener('click', function() {
              const projectId = this.getAttribute('data-id');
              openProjectModal(projectId);
            });
          });

          document.querySelectorAll('.delete-project').forEach(btn => {
            btn.addEventListener('click', function() {
              const projectId = this.getAttribute('data-id');
              const row = this.closest('tr');
              row.style.opacity = '0.5';
              showNotification(\`Project \${projectId} marked for deletion\`);

              setTimeout(() => {
                row.remove();
                showNotification('Project deleted successfully');
              }, 1000);
            });
          });

          // Load more projects
          document.getElementById('load-more-projects').addEventListener('click', function() {
            const tableBody = document.getElementById('projects-table');
            const newProjectId = tableBody.children.length + 1;

            const newRow = document.createElement('tr');
            newRow.setAttribute('data-project-id', newProjectId);
            newRow.innerHTML = \`
              <td>New Project \${newProjectId}</td>
              <td><span class="status-badge" data-status="active">Active</span></td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: \${Math.random() * 100}%"></div>
                </div>
              </td>
              <td>
                <button class="btn btn-primary edit-project" data-id="\${newProjectId}">Edit</button>
                <button class="btn btn-danger delete-project" data-id="\${newProjectId}">Delete</button>
              </td>
            \`;

            tableBody.appendChild(newRow);

            // Re-attach event listeners for new buttons
            newRow.querySelector('.edit-project').addEventListener('click', function() {
              openProjectModal(this.getAttribute('data-id'));
            });

            newRow.querySelector('.delete-project').addEventListener('click', function() {
              newRow.style.opacity = '0.5';
              showNotification(\`Project \${this.getAttribute('data-id')} marked for deletion\`);
              setTimeout(() => newRow.remove(), 1000);
            });

            showNotification('More projects loaded');
          });

          // Modal functionality
          function openProjectModal(projectId) {
            const modal = document.getElementById('project-modal');
            const title = document.getElementById('modal-title');
            const nameInput = document.getElementById('project-name');
            const statusSelect = document.getElementById('project-status');
            const progressInput = document.getElementById('project-progress');

            title.textContent = \`Edit Project \${projectId}\`;

            // Load project data (simulated)
            nameInput.value = \`Project \${projectId}\`;
            statusSelect.value = 'active';
            progressInput.value = Math.floor(Math.random() * 100);

            modal.style.display = 'block';
          }

          document.getElementById('cancel-modal').addEventListener('click', () => {
            document.getElementById('project-modal').style.display = 'none';
          });

          document.getElementById('project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Project updated successfully!');
            document.getElementById('project-modal').style.display = 'none';
          });

          // Notification system
          function showNotification(message) {
            const notification = document.getElementById('notification');
            const messageEl = document.getElementById('notification-message');

            messageEl.textContent = message;
            notification.style.display = 'block';

            setTimeout(() => {
              notification.style.display = 'none';
            }, 3000);
          }

          document.getElementById('close-notification').addEventListener('click', () => {
            document.getElementById('notification').style.display = 'none';
          });

          // Close dropdowns when clicking outside
          document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
              document.getElementById('user-menu').classList.remove('show');
            }
          });

          // Close modal when clicking outside
          document.getElementById('project-modal').addEventListener('click', (e) => {
            if (e.target.id === 'project-modal') {
              document.getElementById('project-modal').style.display = 'none';
            }
          });
        </script>
      </body>
      </html>
    `);
  }

  /**
   * Creates a dynamic content page with elements that appear/ disappear based on interactions
   */
  static async createDynamicContentPage(page: Page): Promise<void> {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dynamic Content - Test Application</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .control-panel { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .dynamic-area { min-height: 200px; border: 2px dashed #ddd; border-radius: 8px; padding: 20px; }
          .dynamic-element { padding: 10px; margin: 5px 0; border-radius: 4px; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
          .btn { padding: 8px 16px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
          .btn-primary { background: #007bff; color: white; }
          .form-group { margin: 10px 0; }
          .form-group label { display: block; margin-bottom: 5px; }
          .form-group input, .form-group select { width: 200px; padding: 5px; }
          .accordion { border: 1px solid #ddd; border-radius: 4px; margin: 10px 0; }
          .accordion-header { background: #f8f9fa; padding: 10px; cursor: pointer; border-bottom: 1px solid #ddd; }
          .accordion-content { padding: 10px; display: none; }
          .accordion-content.active { display: block; }
          .tabs-container { margin: 20px 0; }
          .tab-buttons { display: flex; border-bottom: 1px solid #ddd; }
          .tab-btn { padding: 10px 20px; cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; }
          .tab-btn.active { border-bottom-color: #007bff; color: #007bff; }
          .tab-panel { display: none; padding: 20px 0; }
          .tab-panel.active { display: block; }
          .tree { margin: 20px 0; }
          .tree-node { padding: 5px 0; }
          .tree-node-children { margin-left: 20px; display: none; }
          .tree-node.expanded > .tree-node-children { display: block; }
          .tree-toggle { cursor: pointer; user-select: none; }
          .draggable { background: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 4px; cursor: move; }
          .drop-zone { border: 2px dashed #007bff; padding: 20px; margin: 10px 0; text-align: center; border-radius: 4px; }
          .drop-zone.drag-over { background: #e3f2fd; }
        </style>
      </head>
      <body>
        <h1>Dynamic Content Test Page</h1>
        <p>This page demonstrates various dynamic content scenarios for testing coverage.</p>

        <div class="control-panel">
          <h2>Control Panel</h2>

          <button class="btn btn-primary" id="add-success">Add Success Message</button>
          <button class="btn btn-primary" id="add-warning">Add Warning Message</button>
          <button class="btn btn-primary" id="add-error">Add Error Message</button>
          <button class="btn btn-primary" id="add-info">Add Info Message</button>
          <button class="btn btn-primary" id="clear-all">Clear All</button>

          <div class="form-group">
            <label for="custom-text">Custom Message:</label>
            <input type="text" id="custom-text" placeholder="Enter custom message">
            <select id="custom-type">
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="info">Info</option>
            </select>
            <button class="btn btn-primary" id="add-custom">Add Custom</button>
          </div>

          <div class="form-group">
            <label for="element-count">Number of Elements:</label>
            <input type="number" id="element-count" min="1" max="10" value="3">
            <button class="btn btn-primary" id="add-multiple">Add Multiple</button>
          </div>
        </div>

        <div class="dynamic-area" id="dynamic-area">
          <p><em>Dynamic elements will appear here...</em></p>
        </div>

        <div class="accordion" id="accordion-1">
          <div class="accordion-header" data-target="content-1">
            ▶ Accordion Section 1
          </div>
          <div class="accordion-content" id="content-1">
            <h4>Content for Section 1</h4>
            <p>This content is initially hidden and appears when the accordion is expanded.</p>
            <button class="btn btn-primary" id="accordion-btn-1">Button in Accordion 1</button>
          </div>
        </div>

        <div class="accordion" id="accordion-2">
          <div class="accordion-header" data-target="content-2">
            ▶ Accordion Section 2
          </div>
          <div class="accordion-content" id="content-2">
            <h4>Content for Section 2</h4>
            <p>This accordion contains form elements that are only available when expanded.</p>
            <div class="form-group">
              <label for="accordion-input">Input in Accordion:</label>
              <input type="text" id="accordion-input" placeholder="Type here...">
            </div>
            <button class="btn btn-primary" id="accordion-btn-2">Submit in Accordion 2</button>
          </div>
        </div>

        <div class="tabs-container">
          <div class="tab-buttons">
            <button class="tab-btn active" data-tab="tab-1">Tab 1</button>
            <button class="tab-btn" data-tab="tab-2">Tab 2</button>
            <button class="tab-btn" data-tab="tab-3">Tab 3</button>
          </div>
          <div class="tab-panel active" id="tab-1">
            <h3>Tab 1 Content</h3>
            <p>This is the content for the first tab.</p>
            <button class="btn btn-primary" id="tab1-btn">Tab 1 Button</button>
          </div>
          <div class="tab-panel" id="tab-2">
            <h3>Tab 2 Content</h3>
            <p>This content is only visible when Tab 2 is active.</p>
            <div class="form-group">
              <label for="tab2-input">Tab 2 Input:</label>
              <input type="text" id="tab2-input" placeholder="Tab 2 input field">
            </div>
            <button class="btn btn-primary" id="tab2-btn">Tab 2 Button</button>
          </div>
          <div class="tab-panel" id="tab-3">
            <h3>Tab 3 Content</h3>
            <p>This content appears only when Tab 3 is selected.</p>
            <button class="btn btn-primary" id="tab3-btn">Tab 3 Button</button>
            <div id="dynamic-tab3-content" style="margin-top: 10px;"></div>
          </div>
        </div>

        <div class="tree">
          <div class="tree-node" data-node-id="1">
            <span class="tree-toggle">▶</span> Root Node 1
            <div class="tree-node-children">
              <div class="tree-node" data-node-id="1.1">
                <span class="tree-toggle">▶</span> Child Node 1.1
                <div class="tree-node-children">
                  <div class="tree-node" data-node-id="1.1.1">
                    <span class="tree-toggle">▶</span> Leaf Node 1.1.1
                    <div class="tree-node-children">
                      <button class="btn btn-primary" id="leaf-btn-1">Leaf Button 1</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="tree-node" data-node-id="1.2">
                <span class="tree-toggle">▶</span> Child Node 1.2
                <div class="tree-node-children">
                  <button class="btn btn-primary" id="leaf-btn-2">Leaf Button 2</button>
                </div>
              </div>
            </div>
          </div>
          <div class="tree-node" data-node-id="2">
            <span class="tree-toggle">▶</span> Root Node 2
            <div class="tree-node-children">
              <div class="tree-node" data-node-id="2.1">
                <span class="tree-toggle">▶</span> Child Node 2.1
                <div class="tree-node-children">
                  <button class="btn btn-primary" id="leaf-btn-3">Leaf Button 3</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="draggable" draggable="true" id="draggable-1">
          📦 Draggable Item 1 - Drag me to the drop zone
        </div>
        <div class="draggable" draggable="true" id="draggable-2">
          📦 Draggable Item 2 - Drag me to the drop zone
        </div>

        <div class="drop-zone" id="drop-zone">
          🎯 Drop Zone - Drag items here
        </div>

        <script>
          let elementCounter = 0;

          function addDynamicElement(text, type) {
            elementCounter++;
            const dynamicArea = document.getElementById('dynamic-area');
            const element = document.createElement('div');
            element.className = \`dynamic-element \${type}\`;
            element.id = \`dynamic-element-\${elementCounter}\`;
            element.textContent = text;
            element.setAttribute('data-counter', elementCounter);

            // Add a button to each dynamic element
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = 'Action';
            btn.id = \`dynamic-btn-\${elementCounter}\`;
            btn.style.marginLeft = '10px';
            btn.addEventListener('click', () => {
              alert(\`Action clicked for element \${elementCounter}\`);
            });

            element.appendChild(btn);
            dynamicArea.appendChild(element);
          }

          // Control panel buttons
          document.getElementById('add-success').addEventListener('click', () => {
            addDynamicElement('Success message added!', 'success');
          });

          document.getElementById('add-warning').addEventListener('click', () => {
            addDynamicElement('Warning: This is a warning message', 'warning');
          });

          document.getElementById('add-error').addEventListener('click', () => {
            addDynamicElement('Error: Something went wrong!', 'error');
          });

          document.getElementById('add-info').addEventListener('click', () => {
            addDynamicElement('Info: This is an informational message', 'info');
          });

          document.getElementById('clear-all').addEventListener('click', () => {
            const dynamicArea = document.getElementById('dynamic-area');
            dynamicArea.innerHTML = '<p><em>Dynamic elements will appear here...</em></p>';
            elementCounter = 0;
          });

          document.getElementById('add-custom').addEventListener('click', () => {
            const text = document.getElementById('custom-text').value;
            const type = document.getElementById('custom-type').value;
            if (text.trim()) {
              addDynamicElement(text, type);
              document.getElementById('custom-text').value = '';
            }
          });

          document.getElementById('add-multiple').addEventListener('click', () => {
            const count = parseInt(document.getElementById('element-count').value);
            for (let i = 1; i <= count; i++) {
              setTimeout(() => {
                addDynamicElement(\`Multiple element \${i}\`, 'info');
              }, i * 100);
            }
          });

          // Accordion functionality
          document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', function() {
              const targetId = this.getAttribute('data-target');
              const content = document.getElementById(targetId);
              const isActive = content.classList.contains('active');

              // Close all accordions
              document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('active'));
              document.querySelectorAll('.accordion-header').forEach(h => h.innerHTML = h.innerHTML.replace('▼', '▶'));

              if (!isActive) {
                content.classList.add('active');
                this.innerHTML = this.innerHTML.replace('▶', '▼');
              }
            });
          });

          // Tab functionality
          document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              const targetTab = this.getAttribute('data-tab');

              // Remove active class from all tabs and panels
              document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
              document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

              // Add active class to clicked tab and corresponding panel
              this.classList.add('active');
              document.getElementById(targetTab).classList.add('active');

              // Add dynamic content to tab 3 when it becomes active
              if (targetTab === 'tab-3') {
                const dynamicContent = document.getElementById('dynamic-tab3-content');
                if (dynamicContent.children.length === 0) {
                  dynamicContent.innerHTML = \`
                    <div class="dynamic-element success">
                      <strong>Dynamic content added!</strong> This content only appears when Tab 3 is activated.
                      <button class="btn btn-primary" id="dynamic-tab3-btn">Dynamic Tab Button</button>
                    </div>
                  \`;
                }
              }
            });
          });

          // Tree functionality
          document.querySelectorAll('.tree-toggle').forEach(toggle => {
            toggle.addEventListener('click', function(e) {
              e.stopPropagation();
              const node = this.closest('.tree-node');
              const isExpanded = node.classList.contains('expanded');

              if (isExpanded) {
                node.classList.remove('expanded');
                this.textContent = '▶';
              } else {
                node.classList.add('expanded');
                this.textContent = '▼';
              }
            });
          });

          // Drag and drop functionality
          let draggedElement = null;

          document.querySelectorAll('.draggable').forEach(draggable => {
            draggable.addEventListener('dragstart', (e) => {
              draggedElement = e.target;
              e.dataTransfer.effectAllowed = 'move';
              e.target.style.opacity = '0.5';
            });

            draggable.addEventListener('dragend', (e) => {
              e.target.style.opacity = '';
            });
          });

          const dropZone = document.getElementById('drop-zone');

          dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            dropZone.classList.add('drag-over');
          });

          dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
          });

          dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            if (draggedElement) {
              const droppedText = draggedElement.textContent;
              dropZone.innerHTML += \`<div class="dynamic-element success">✅ \${droppedText} dropped successfully!</div>\`;
              draggedElement.style.display = 'none';
              draggedElement = null;
            }
          });

          // Add some initial dynamic elements after page load
          setTimeout(() => {
            addDynamicElement('Page loaded successfully!', 'success');
          }, 1000);

          setTimeout(() => {
            addDynamicElement('Try interacting with the controls above', 'info');
          }, 2000);
        </script>
      </body>
      </html>
    `);
  }
}