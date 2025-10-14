import { spawn, ChildProcess } from 'child_process';
import { PlaywrightCoverConfig } from '../types';

// Polyfill fetch for Node.js environments
if (!global.fetch) {
  (global as any).fetch = async (url: string, options?: RequestInit) => {
    const { default: https } = await import('https');
    const { default: http } = await import('http');
    const { URL } = await import('url');

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.request(url, {
        method: options?.method || 'HEAD',
        timeout: options?.signal ? 2000 : undefined,
        headers: options?.headers as any
      }, (res) => {
        resolve({
          ok: res.statusCode! >= 200 && res.statusCode! < 300,
          status: res.statusCode,
          statusText: res.statusMessage
        } as Response);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  };
}

export interface WebServerConfig {
  command: string;
  url?: string;
  port?: number;
  reuseExistingServer?: boolean;
  timeout?: number;
  env?: Record<string, string>;
}

export interface WebServerStatus {
  running: boolean;
  process?: ChildProcess;
  url: string;
  startedByTool: boolean;
}

export class WebServerManager {
  private serverProcesses: Map<string, ChildProcess> = new Map();
  private serverStatuses: Map<string, WebServerStatus> = new Map();

  /**
   * Start a web server before running analysis
   */
  async startWebServer(config: WebServerConfig, serverId: string = 'default'): Promise<WebServerStatus> {
    const expectedUrl = config.url || `http://localhost:${config.port || 3000}`;
    const reuseExisting = config.reuseExistingServer !== false; // default to true
    const timeout = config.timeout || 30000;

    console.log(`🚀 Starting web server for ${expectedUrl}...`);

    // Check if server is already running (if reuseExisting is true)
    if (reuseExisting) {
      const actualUrl = await this.findRunningServer(expectedUrl, timeout);
      if (actualUrl) {
        console.log(`✅ Server already running at ${actualUrl}`);
        const status: WebServerStatus = {
          running: true,
          url: actualUrl,
          startedByTool: false
        };
        this.serverStatuses.set(serverId, status);
        return status;
      }
    }

    // Start new server process
    try {
      const serverProcess = this.spawnServerProcess(config, expectedUrl);
      this.serverProcesses.set(serverId, serverProcess);

      // Wait for server to be ready and detect actual URL
      const actualUrl = await this.waitForServerAndDetectUrl(expectedUrl, config, timeout);

      const status: WebServerStatus = {
        running: true,
        process: serverProcess,
        url: actualUrl,
        startedByTool: true
      };
      this.serverStatuses.set(serverId, status);

      console.log(`✅ Server started successfully at ${actualUrl}`);
      return status;

    } catch (error) {
      console.error(`❌ Failed to start server for ${expectedUrl}:`, error);
      throw error;
    }
  }

  /**
   * Stop a web server that was started by the tool
   */
  async stopWebServer(serverId: string = 'default'): Promise<void> {
    const status = this.serverStatuses.get(serverId);
    if (!status || !status.startedByTool) {
      return; // Don't stop servers we didn't start
    }

    const process = this.serverProcesses.get(serverId);
    if (process) {
      console.log(`🛑 Stopping web server at ${status.url}...`);

      // Try graceful shutdown first
      process.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (process && !process.killed) {
          console.log(`⚡ Force killing web server...`);
          process.kill('SIGKILL');
        }
      }, 5000);

      this.serverProcesses.delete(serverId);
      this.serverStatuses.delete(serverId);
    }
  }

  /**
   * Stop all servers started by the tool
   */
  async stopAllServers(): Promise<void> {
    const serverIds = Array.from(this.serverStatuses.keys());
    await Promise.all(serverIds.map(id => this.stopWebServer(id)));
  }

  /**
   * Find a running server, checking nearby ports if the expected port is busy
   */
  private async findRunningServer(expectedUrl: string, timeout: number = 3000): Promise<string | null> {
    const url = new URL(expectedUrl);
    const expectedPort = parseInt(url.port) || 3000;

    // First check the expected URL
    if (await this.isServerRunning(expectedUrl)) {
      return expectedUrl;
    }

    // Check nearby ports (common fallback ports)
    const fallbackPorts = [expectedPort + 1, expectedPort + 2, 3001, 3002, 8000, 8001, 8080, 8081];

    for (const port of fallbackPorts) {
      const testUrl = `${url.protocol}//${url.hostname}:${port}`;
      if (await this.isServerRunning(testUrl)) {
        console.log(`🔍 Found server running on alternate port ${port}`);
        return testUrl;
      }
    }

    return null;
  }

  /**
   * Check if a server is already running at the given URL
   */
  async isServerRunning(url: URL | string): Promise<boolean> {
    try {
      const response = await fetch(url.toString(), {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Spawn the server process
   */
  private spawnServerProcess(config: WebServerConfig, url: string): ChildProcess {
    const [command, ...args] = config.command.split(' ');

    // Set up environment variables
    const env = {
      ...process.env,
      ...config.env,
      PORT: url.match(/:(\d+)/)?.[1] || '3000',
      NODE_ENV: 'development'
    };

    const serverProcess = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      detached: false
    });

    // Log server output for debugging
    serverProcess.stdout?.on('data', (data) => {
      console.log(`📝 Server output: ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      console.warn(`⚠️ Server error: ${data.toString().trim()}`);
    });

    serverProcess.on('error', (error) => {
      console.error(`❌ Server process error:`, error);
    });

    serverProcess.on('exit', (code, signal) => {
      console.log(`🔄 Server process exited with code ${code}, signal ${signal}`);
    });

    return serverProcess;
  }

  /**
   * Wait for server to be ready and detect actual URL (for port changes)
   */
  private async waitForServerAndDetectUrl(expectedUrl: string, config: WebServerConfig, timeout: number): Promise<string> {
    const startTime = Date.now();
    const maxTime = startTime + timeout;

    // Monitor server output for port information
    let detectedPort: number | null = null;

    if (config.port) {
      // Start by checking the configured port
      const configuredUrl = `http://localhost:${config.port}`;
      if (await this.isServerRunning(configuredUrl)) {
        return configuredUrl;
      }
    }

    while (Date.now() < maxTime) {
      // First check the expected URL
      if (await this.isServerRunning(expectedUrl)) {
        return expectedUrl;
      }

      // Then check fallback ports (for servers that change ports dynamically)
      const fallbackPorts = [3001, 3002, 3003, 8000, 8001, 8080, 8081];
      for (const port of fallbackPorts) {
        const testUrl = `http://localhost:${port}`;
        if (await this.isServerRunning(testUrl)) {
          console.log(`🔍 Server started on alternate port ${port}`);
          return testUrl;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Server did not become available at ${expectedUrl} or fallback ports within ${timeout}ms`);
  }

  /**
   * Wait for server to be ready (legacy method for compatibility)
   */
  private async waitForServer(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    const maxTime = startTime + timeout;

    while (Date.now() < maxTime) {
      if (await this.isServerRunning(url)) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Server at ${url} did not start within ${timeout}ms`);
  }

  /**
   * Extract web server config from Playwright config file
   */
  async extractFromPlaywrightConfig(configPath?: string): Promise<WebServerConfig | null> {
    const possiblePaths = [
      configPath,
      'playwright.config.js',
      'playwright.config.ts',
      'playwright.config.mjs'
    ].filter(Boolean);

    for (const path of possiblePaths) {
      try {
        if (require('fs').existsSync(path)) {
          const configModule = require(path);
          const config = configModule.default || configModule;

          if (config.webServer) {
            console.log(`📋 Found web server configuration in ${path}`);

            // Handle both single webServer and array of webServers
            const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;

            return {
              command: webServer.command,
              url: webServer.url,
              port: webServer.port,
              reuseExistingServer: webServer.reuseExistingServer,
              timeout: webServer.timeout,
              env: webServer.env
            };
          }
        }
      } catch (error) {
        // Try next path
        continue;
      }
    }

    return null;
  }

  /**
   * Get current server status
   */
  getServerStatus(serverId: string = 'default'): WebServerStatus | undefined {
    return this.serverStatuses.get(serverId);
  }

  /**
   * Get all server statuses
   */
  getAllServerStatuses(): Map<string, WebServerStatus> {
    return new Map(this.serverStatuses);
  }
}