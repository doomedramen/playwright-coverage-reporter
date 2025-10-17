import { Page, expect, Locator } from '@playwright/test';

export class TestHelpers {
  /**
   * Wait for a selector to be present in the DOM with timeout
   */
  static async waitForSelector(page: Page, selector: string, timeout = 5000): Promise<Locator> {
    await page.waitForSelector(selector, { timeout });
    return page.locator(selector);
  }

  /**
   * Check if an element is visible and handle the assertion
   */
  static async expectVisible(page: Page, selector: string, timeout = 5000): Promise<void> {
    const element = page.locator(selector);
    await expect(element).toBeVisible({ timeout });
  }

  /**
   * Check if an element is hidden or not present
   */
  static async expectHidden(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await expect(element).toBeHidden();
  }

  /**
   * Fill an input field and verify the value
   */
  static async fillAndVerify(page: Page, selector: string, value: string): Promise<void> {
    const element = page.locator(selector);
    await element.fill(value);
    await expect(element).toHaveValue(value);
  }

  /**
   * Click an element and wait for navigation or result
   */
  static async clickAndWait(page: Page, selector: string, waitForSelector?: string): Promise<void> {
    await page.click(selector);
    if (waitForSelector) {
      await this.expectVisible(page, waitForSelector);
    }
  }

  /**
   * Get all visible text content from elements matching a selector
   */
  static async getVisibleTexts(page: Page, selector: string): Promise<string[]> {
    const elements = await page.locator(selector).all();
    const texts: string[] = [];

    for (const element of elements) {
      const isVisible = await element.isVisible();
      if (isVisible) {
        const text = await element.textContent();
        if (text && text.trim()) {
          texts.push(text.trim());
        }
      }
    }

    return texts;
  }

  /**
   * Count elements that are currently visible
   */
  static async countVisibleElements(page: Page, selector: string): Promise<number> {
    const elements = await page.locator(selector).all();
    let visibleCount = 0;

    for (const element of elements) {
      if (await element.isVisible()) {
        visibleCount++;
      }
    }

    return visibleCount;
  }

  /**
   * Wait for element count to match expected value
   */
  static async waitForElementCount(
    page: Page,
    selector: string,
    expectedCount: number,
    timeout = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const count = await this.countVisibleElements(page, selector);
      if (count === expectedCount) {
        return;
      }
      await page.waitForTimeout(100);
    }

    throw new Error(`Timeout waiting for ${expectedCount} elements matching ${selector}`);
  }

  /**
   * Hover over an element and verify tooltip or dropdown appears
   */
  static async hoverAndVerifyTooltip(page: Page, selector: string, tooltipSelector?: string): Promise<void> {
    const element = page.locator(selector);
    await element.hover();

    if (tooltipSelector) {
      await this.expectVisible(page, tooltipSelector);
    } else {
      // Look for common tooltip patterns
      const tooltipSelectors = [
        '[role="tooltip"]',
        '.tooltip',
        '.tooltiptext',
        '[aria-label]:visible',
        '[title]:visible'
      ];

      let tooltipFound = false;
      for (const tooltipSel of tooltipSelectors) {
        try {
          await page.waitForSelector(tooltipSel, { timeout: 1000 });
          tooltipFound = true;
          break;
        } catch {
          // Continue to next selector
        }
      }

      if (!tooltipFound) {
        console.warn(`No tooltip found for ${selector}`);
      }
    }
  }

  /**
   * Test keyboard navigation through form elements
   */
  static async testKeyboardNavigation(page: Page, firstSelector: string): Promise<string[]> {
    const focusedElements: string[] = [];
    const element = page.locator(firstSelector);
    await element.focus();
    focusedElements.push(firstSelector);

    // Press Tab up to 10 times or until we cycle back
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');

      // Get current focused element
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (el && el.tagName !== 'BODY') {
          const selector = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : '';
          const className = el.className ? `.${el.className.split(' ').join('.')}` : '';
          return selector + (id || className);
        }
        return null;
      });

      if (focusedElement && focusedElement !== firstSelector) {
        focusedElements.push(focusedElement);
      } else if (focusedElement === firstSelector) {
        // We've cycled back to the beginning
        break;
      }
    }

    return focusedElements;
  }

  /**
   * Check accessibility attributes of an element
   */
  static async checkAccessibility(page: Page, selector: string): Promise<{
    hasAriaLabel: boolean;
    hasAriaRole: boolean;
    hasAriaDescribedBy: boolean;
    hasTabIndex: boolean;
    isFocusable: boolean;
  }> {
    const result = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;

      return {
        hasAriaLabel: !!element.getAttribute('aria-label'),
        hasAriaRole: !!element.getAttribute('role'),
        hasAriaDescribedBy: !!element.getAttribute('aria-describedby'),
        hasTabIndex: element.hasAttribute('tabindex'),
        isFocusable: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName) ||
                     element.hasAttribute('tabindex') ||
                     element.getAttribute('contenteditable') === 'true'
      };
    }, selector);

    return result || {
      hasAriaLabel: false,
      hasAriaRole: false,
      hasAriaDescribedBy: false,
      hasTabIndex: false,
      isFocusable: false
    };
  }

  /**
   * Get computed styles for an element
   */
  static async getComputedStyle(page: Page, selector: string): Promise<CSSStyleDeclaration> {
    return await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      return element ? window.getComputedStyle(element) : null;
    }, selector);
  }

  /**
   * Check if element is within viewport
   */
  static async isElementInViewport(page: Page, selector: string): Promise<boolean> {
    return await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
      );
    }, selector);
  }

  /**
   * Scroll element into view and verify it's visible
   */
  static async scrollIntoView(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    await expect(element).toBeInViewport();
  }

  /**
   * Test drag and drop interaction
   */
  static async dragAndDrop(page: Page, dragSelector: string, dropSelector: string): Promise<void> {
    const dragElement = page.locator(dragSelector);
    const dropElement = page.locator(dropSelector);

    await dragElement.dragTo(dropElement);
  }

  /**
   * Take screenshot with custom name
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ path: `test-screenshots/${name}-${Date.now()}.png` });
  }

  /**
   * Get all form data from a form element
   */
  static async getFormData(page: Page, formSelector: string): Promise<Record<string, string>> {
    return await page.evaluate((sel) => {
      const form = document.querySelector(sel);
      if (!form) return {};

      const formData = new FormData(form as HTMLFormElement);
      const data: Record<string, string> = {};

      for (const [key, value] of formData.entries()) {
        data[key] = value as string;
      }

      return data;
    }, formSelector);
  }

  /**
   * Wait for network idle (no active network requests)
   */
  static async waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Mock API response
   */
  static async mockApiResponse(page: Page, url: string, response: any): Promise<void> {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Console log helper for debugging
   */
  static async logElementInfo(page: Page, selector: string): Promise<void> {
    const info = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;

      return {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        textContent: element.textContent?.substring(0, 100),
        isVisible: element.offsetParent !== null,
        attributes: Array.from(element.attributes).map(attr => ({
          name: attr.name,
          value: attr.value
        }))
      };
    }, selector);

    console.log(`Element info for ${selector}:`, info);
  }

  /**
   * Generate test data
   */
  static generateTestData(): {
    email: string;
    name: string;
    phone: string;
    password: string;
    message: string;
  } {
    const timestamp = Date.now();
    return {
      email: `test+${timestamp}@example.com`,
      name: `Test User ${timestamp}`,
      phone: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      password: `TestPass123!${timestamp}`,
      message: `This is a test message generated at ${new Date().toISOString()}`
    };
  }

  /**
   * Clear all input fields in a form
   */
  static async clearForm(page: Page, formSelector: string): Promise<void> {
    await page.evaluate((sel) => {
      const form = document.querySelector(sel);
      if (!form) return;

      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
          input.value = '';
        } else if (input instanceof HTMLSelectElement) {
          input.selectedIndex = 0;
        }
      });
    }, formSelector);
  }

  /**
   * Check if element has specific CSS class
   */
  static async hasClass(page: Page, selector: string, className: string): Promise<boolean> {
    return await page.evaluate((sel, cls) => {
      const element = document.querySelector(sel);
      return element ? element.classList.contains(cls) : false;
    }, selector, className);
  }

  /**
   * Get element's bounding rectangle
   */
  static async getBoundingClientRect(page: Page, selector: string): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> {
    return await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return { x: 0, y: 0, width: 0, height: 0 };

      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    }, selector);
  }
}

/**
 * Coverage-specific test helpers
 */
export class CoverageTestHelpers {
  /**
   * Extract all selectors that were used in a test
   */
  static extractUsedSelectors(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      // This would need to be implemented by the coverage reporter
      // For now, return empty array as placeholder
      return [];
    });
  }

  /**
   * Verify that coverage data was collected for a test
   */
  static async verifyCoverageCollected(page: Page): Promise<boolean> {
    // This would check if coverage tracking is working
    return await page.evaluate(() => {
      return typeof window !== 'undefined' &&
             window.__coverage_collector__ !== undefined;
    });
  }

  /**
   * Get coverage report data
   */
  static async getCoverageData(page: Page): Promise<any> {
    return await page.evaluate(() => {
      return window.__coverage_data__ || null;
    });
  }

  /**
   * Mark test interaction for coverage tracking
   */
  static async markInteraction(page: Page, selector: string, interactionType: string): Promise<void> {
    await page.evaluate((sel, type) => {
      if (window.__coverage_collector__) {
        window.__coverage_collector__.markInteraction(sel, type);
      }
    }, selector, interactionType);
  }
}

/**
 * Performance test helpers
 */
export class PerformanceTestHelpers {
  /**
   * Measure page load time
   */
  static async measurePageLoadTime(page: Page): Promise<number> {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation.loadEventEnd - navigation.loadEventStart;
    });

    return metrics;
  }

  /**
   * Measure interaction time
   */
  static async measureInteractionTime(
    page: Page,
    selector: string,
    action: () => Promise<void>
  ): Promise<number> {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * Get memory usage
   */
  static async getMemoryUsage(page: Page): Promise<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  }> {
    return await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
    });
  }
}