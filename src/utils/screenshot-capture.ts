import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotOptions {
  outputPath: string;
  selector: string;
  fileName?: string;
  fullPage?: boolean;
  omitBackground?: boolean;
  timeout?: number;
}

export class ScreenshotCapture {
  /**
   * Capture screenshot of a specific element by selector
   */
  static async captureElementScreenshot(
    page: Page,
    options: ScreenshotOptions
  ): Promise<string> {
    const {
      outputPath,
      selector,
      fileName,
      fullPage = false,
      omitBackground = false,
      timeout = 5000
    } = options;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Wait for element to be visible
    await page.waitForSelector(selector, { state: 'visible', timeout });

    // Create screenshot filename
    const screenshotName = fileName || 
      `screenshot-${Date.now()}-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const screenshotPath = path.join(outputPath, screenshotName);

    // Capture screenshot of the element
    const element = page.locator(selector);
    await element.screenshot({
      path: screenshotPath,
      omitBackground
    });

    return screenshotPath;
  }

  /**
   * Capture screenshots of multiple elements
   */
  static async captureMultipleScreenshots(
    page: Page,
    selectors: string[],
    outputPath: string,
    options: Partial<ScreenshotOptions> = {}
  ): Promise<string[]> {
    const screenshotPaths: string[] = [];

    for (const [index, selector] of selectors.entries()) {
      try {
        const screenshotPath = await this.captureElementScreenshot(page, {
          outputPath,
          selector,
          fileName: `element-${index}-${Date.now()}.png`,
          ...options
        });
        screenshotPaths.push(screenshotPath);
      } catch (error) {
        console.warn(`Failed to capture screenshot for selector ${selector}:`, error);
      }
    }

    return screenshotPaths;
  }

  /**
   * Capture screenshot of entire page
   */
  static async capturePageScreenshot(
    page: Page,
    outputPath: string,
    fileName?: string,
    fullPage: boolean = true
  ): Promise<string> {
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const screenshotName = fileName || `page-${Date.now()}.png`;
    const screenshotPath = path.join(outputPath, screenshotName);

    await page.screenshot({
      path: screenshotPath
    });

    return screenshotPath;
  }

  /**
   * Capture screenshots for uncovered elements
   */
  static async captureUncoveredElementScreenshots(
    page: Page,
    uncoveredElements: Array<{ selector: string; type?: string; text?: string }>,
    outputPath: string
  ): Promise<{ selector: string; screenshotPath: string; success: boolean; error?: string }[]> {
    const results: { selector: string; screenshotPath: string; success: boolean; error?: string }[] = [];

    for (const element of uncoveredElements) {
      try {
        // Wait a bit for page to stabilize
        await page.waitForLoadState('domcontentloaded');
        
        // Check if the element exists on the current page
        const elementExists = await page.locator(element.selector).count() > 0;
        if (!elementExists) {
          results.push({
            selector: element.selector,
            screenshotPath: '',
            success: false,
            error: 'Element not found on current page'
          });
          continue;
        }

        // Capture screenshot of the uncovered element
        const screenshotPath = await this.captureElementScreenshot(page, {
          outputPath,
          selector: element.selector,
          fileName: `uncovered-${element.type || 'element'}-${Date.now()}-${element.selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`
        });

        results.push({
          selector: element.selector,
          screenshotPath,
          success: true
        });
      } catch (error) {
        results.push({
          selector: element.selector,
          screenshotPath: '',
          success: false,
          error: (error as Error).message
        });
      }
    }

    return results;
  }
}