const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.TEST_SERVER_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'fixtures')));

// Test pages endpoints
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login Page</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; }
        .error { color: red; font-size: 14px; margin-top: 5px; }
      </style>
    </head>
    <body>
      <h1>Login</h1>
      <form id="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" placeholder="Enter your email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" placeholder="Enter your password" required>
        </div>
        <button type="submit" class="btn">Login</button>
        <div id="error" class="error" style="display: none;"></div>
      </form>

      <script>
        document.getElementById('login-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;

          if (email === 'test@example.com' && password === 'password123') {
            window.location.href = '/dashboard';
          } else {
            document.getElementById('error').textContent = 'Invalid credentials';
            document.getElementById('error').style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 10px 0; }
        .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; margin: 5px; }
        .nav { margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #007bff; }
      </style>
    </head>
    <body>
      <div class="nav">
        <a href="/">Home</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/settings">Settings</a>
      </div>

      <h1>Dashboard</h1>
      <div class="card">
        <h2>Welcome Back!</h2>
        <p>This is the main dashboard page.</p>
        <button class="btn" id="refresh-btn">Refresh Data</button>
        <button class="btn" id="settings-btn">Go to Settings</button>
      </div>

      <div class="card">
        <h3>Quick Actions</h3>
        <button class="btn" id="action1">Action 1</button>
        <button class="btn" id="action2">Action 2</button>
        <button class="btn" id="action3">Action 3</button>
      </div>

      <script>
        document.getElementById('refresh-btn').addEventListener('click', () => {
          alert('Data refreshed!');
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
          window.location.href = '/settings';
        });

        document.getElementById('action1').addEventListener('click', () => {
          console.log('Action 1 clicked');
        });

        document.getElementById('action2').addEventListener('click', () => {
          console.log('Action 2 clicked');
        });

        document.getElementById('action3').addEventListener('click', () => {
          console.log('Action 3 clicked');
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/settings', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Settings</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; margin-right: 10px; }
        .nav { margin-bottom: 20px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #007bff; }
      </style>
    </head>
    <body>
      <div class="nav">
        <a href="/">Home</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/settings">Settings</a>
      </div>

      <h1>Settings</h1>
      <form id="settings-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" value="testuser">
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="test@example.com">
        </div>

        <div class="form-group">
          <label for="theme">Theme</label>
          <select id="theme" name="theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="notifications" name="notifications" checked>
            Enable notifications
          </label>
        </div>

        <button type="submit" class="btn">Save Settings</button>
        <button type="button" class="btn" id="cancel-btn">Cancel</button>
      </form>

      <script>
        document.getElementById('settings-form').addEventListener('submit', (e) => {
          e.preventDefault();
          alert('Settings saved successfully!');
        });

        document.getElementById('cancel-btn').addEventListener('click', () => {
          window.location.href = '/dashboard';
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/dynamic-content', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dynamic Content</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .control-panel { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .dynamic-area { min-height: 200px; border: 2px dashed #ddd; border-radius: 8px; padding: 20px; }
        .dynamic-element { padding: 10px; margin: 5px 0; border-radius: 4px; background: #e3f2fd; }
        .btn { padding: 8px 16px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; }
        .hidden { display: none; }
      </style>
    </head>
    <body>
      <h1>Dynamic Content Test Page</h1>

      <div class="control-panel">
        <h3>Controls</h3>
        <button class="btn" id="add-element">Add Element</button>
        <button class="btn" id="clear-elements">Clear All</button>
        <button class="btn" id="toggle-visibility">Toggle Visibility</button>
      </div>

      <div class="dynamic-area" id="dynamic-area">
        <p>Dynamic elements will appear here...</p>
      </div>

      <div id="hidden-content" class="hidden">
        <h2>Initially Hidden Content</h2>
        <p>This content is hidden initially and can be shown via JavaScript.</p>
        <button class="btn" id="hidden-btn">Hidden Button</button>
      </div>

      <script>
        let elementCount = 0;

        document.getElementById('add-element').addEventListener('click', () => {
          elementCount++;
          const element = document.createElement('div');
          element.className = 'dynamic-element';
          element.id = \`dynamic-element-\${elementCount}\`;
          element.textContent = \`Dynamic Element \${elementCount}\`;

          const btn = document.createElement('button');
          btn.className = 'btn';
          btn.textContent = 'Click Me';
          btn.style.marginLeft = '10px';
          btn.addEventListener('click', () => {
            alert(\`Element \${elementCount} clicked!\`);
          });

          element.appendChild(btn);
          document.getElementById('dynamic-area').appendChild(element);
        });

        document.getElementById('clear-elements').addEventListener('click', () => {
          document.getElementById('dynamic-area').innerHTML = '<p>Dynamic elements will appear here...</p>';
          elementCount = 0;
        });

        document.getElementById('toggle-visibility').addEventListener('click', () => {
          const hiddenContent = document.getElementById('hidden-content');
          hiddenContent.classList.toggle('hidden');
        });

        // Add some elements automatically after page load
        setTimeout(() => {
          document.getElementById('add-element').click();
        }, 1000);

        setTimeout(() => {
          document.getElementById('add-element').click();
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

// API endpoints for testing
app.get('/api/user', (req, res) => {
  res.json({
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user'
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'test@example.com' && password === 'password123') {
    res.json({
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📄 Available pages:`);
  console.log(`   - http://localhost:${PORT}/login`);
  console.log(`   - http://localhost:${PORT}/dashboard`);
  console.log(`   - http://localhost:${PORT}/settings`);
  console.log(`   - http://localhost:${PORT}/dynamic-content`);
  console.log(`   - http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Test server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Test server shutting down gracefully...');
  process.exit(0);
});