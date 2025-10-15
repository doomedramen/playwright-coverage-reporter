import { test as base, type Page, type Locator, TestInfo } from '@playwright/test';
import { PageElement, TestSelector, SelectorType, ElementType } from '../types';
import { RuntimeElementDiscoverer } from '../utils/runtime-element-discoverer';
import { CoverageAggregator } from '../utils/coverage-aggregator';

export interface CoverageOptions {
  outputPath?: string;
  threshold?: number;
  verbose?: boolean;
  elementDiscovery?: boolean;
  runtimeDiscovery?: boolean;
  captureScreenshots?: boolean;
}

export interface CoverageData {
  discoveredElements: PageElement[];
  testedSelectors: TestSelector[];
  pageUrl?: string;
}

export interface CoverageFixture {
  page: Page;
  trackInteraction: (selector: string, action?: string) => Promise<void>;
  getCoveredElements: () => TestSelector[];
  getDiscoveredElements: () => Promise<PageElement[]>;
  startRuntimeDiscovery: () => Promise<void>;
  stopRuntimeDiscovery: () => Promise<void>;
  coverageOptions: CoverageOptions;
}

// Global coverage data store (shared across tests)
const globalCoverageData = new Map<string, CoverageData>();

class CoverageTracker {
  public coveredSelectors: TestSelector[] = [];
  public discoveredElements: PageElement[] = [];
  private page?: Page;
  private runtimeDiscoverer?: RuntimeElementDiscoverer;
  private aggregator?: CoverageAggregator;

  async discoverPageElements(page: Page): Promise<PageElement[]> {
    this.page = page;
    const elements: PageElement[] = [];

    // Discover interactive elements using JavaScript injection
    const discoveredElements = await page.evaluate(() => {
      const elements: any[] = [];

      // Function to get element details
      const getElementDetails = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        return {
          tagName: element.tagName.toLowerCase(),
          selector: generateSelector(element),
          text: element.textContent?.trim().substring(0, 100) || '',
          id: element.id || '',
          className: element.className || '',
          xpath: getXPath(element),
          role: element.getAttribute('role') || '',
          accessibleName: element.getAttribute('aria-label') || element.getAttribute('title') || '',
          isVisible: computedStyle.display !== 'none' &&
                   computedStyle.visibility !== 'hidden' &&
                   rect.width > 0 && rect.height > 0,
          isEnabled: !(element as HTMLInputElement).disabled,
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        };
      };

      // Generate CSS selector for element
      const generateSelector = (element: Element): string => {
        if (element.id) {
          return `#${element.id}`;
        }

        let path = element.tagName.toLowerCase();
        let parent = element.parentElement;

        while (parent) {
          let selector = parent.tagName.toLowerCase();
          if (parent.id) {
            selector = `#${parent.id}`;
            path = `${selector} > ${path}`;
            break;
          }
          parent = parent.parentElement;
        }

        return path;
      };

      // Generate XPath for element
      const getXPath = (element: Element): string => {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }

        const parts: string[] = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
          let index = 0;
          let sibling = element.previousSibling;

          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
              index++;
            }
            sibling = sibling.previousSibling;
          }

          const tagName = element.nodeName.toLowerCase();
          const pathIndex = index > 0 ? `[${index + 1}]` : '';
          parts.unshift(`${tagName}${pathIndex}`);

          element = element.parentElement!;
        }

        return '/' + parts.join('/');
      };

      // Find all interactive elements
      const interactiveSelectors = [
        'button', 'input', 'a', 'select', 'textarea',
        '[role="button"]', '[role="link"]', '[role="menuitem"]',
        '[role="tab"]', '[role="checkbox"]', '[role="radio"]',
        '[onclick]', '[onmousedown]', '[onmouseup]', '[onclick]',
        'button:not([disabled])', 'input:not([disabled])',
        'select:not([disabled])', 'textarea:not([disabled])'
      ];

      interactiveSelectors.forEach(selector => {
        try {
          const foundElements = document.querySelectorAll(selector);
          foundElements.forEach(element => {
            elements.push(getElementDetails(element));
          });
        } catch (error) {
          // Ignore invalid selectors
        }
      });

      // Remove duplicates
      const uniqueElements = elements.filter((element, index, self) =>
        index === self.findIndex((e) => e.selector === element.selector)
      );

      return uniqueElements;
    });

    // Convert to PageElement format
    discoveredElements.forEach(element => {
      const elementType = this.determineElementType(element.tagName, element.role);

      elements.push({
        selector: element.selector,
        type: elementType,
        text: element.text,
        id: element.id,
        class: element.className,
        xpath: element.xpath,
        role: element.role,
        accessibleName: element.accessibleName,
        isVisible: element.isVisible,
        isEnabled: element.isEnabled,
        boundingBox: element.boundingBox
      });
    });

    this.discoveredElements = elements;
    return elements;
  }

  determineElementType(tagName: string, role: string): ElementType {
    const tag = tagName.toLowerCase();

    switch (tag) {
      case 'button':
        return ElementType.BUTTON;
      case 'input':
        return ElementType.INPUT;
      case 'a':
        return ElementType.LINK;
      case 'select':
        return ElementType.SELECT;
      case 'textarea':
        return ElementType.TEXTAREA;
    }

    // Check role-based types
    switch (role) {
      case 'button':
        return ElementType.BUTTON;
      case 'link':
        return ElementType.LINK;
      case 'checkbox':
        return ElementType.CHECKBOX;
      case 'radio':
        return ElementType.RADIO;
      case 'menuitem':
      case 'tab':
        return ElementType.INTERACTIVE_ELEMENT;
    }

    // Check input types
    if (tag === 'input') {
      // This would need more specific handling for input type
      return ElementType.INPUT;
    }

    return ElementType.CLICKABLE_ELEMENT;
  }

  normalizeSelector(selector: string): string {
    // Remove text content from quotes for normalization
    return selector.replace(/=["'][^"']*["']/g, '="..."');
  }

  determineSelectorType(selector: string): SelectorType {
    if (selector.startsWith('//') || selector.startsWith('(')) {
      return SelectorType.XPATH;
    }
    if (selector.startsWith('text=')) {
      return SelectorType.TEXT;
    }
    if (selector.startsWith('role=')) {
      return SelectorType.ROLE;
    }
    if (selector.startsWith('data-testid') || selector.includes('[test-id]')) {
      return SelectorType.TEST_ID;
    }
    if (selector.startsWith('alt=')) {
      return SelectorType.ALT_TEXT;
    }
    if (selector.startsWith('placeholder=')) {
      return SelectorType.PLACEHOLDER;
    }
    if (selector.startsWith('label=')) {
      return SelectorType.LABEL;
    }
    return SelectorType.CSS;
  }

  async startRuntimeDiscovery(page: Page, options: any = {}): Promise<void> {
    this.page = page;
    this.runtimeDiscoverer = new RuntimeElementDiscoverer(page, {
      verbose: options.verbose || false,
      includeHidden: options.includeHidden || false,
      customSelectors: options.customSelectors || [],
      excludeSelectors: options.excludeSelectors || []
    });

    await this.runtimeDiscoverer.startMonitoring();
  }

  async stopRuntimeDiscovery(): Promise<void> {
    if (this.runtimeDiscoverer) {
      await this.runtimeDiscoverer.stopMonitoring();
    }
  }

  async getRuntimeDiscoveredElements(): Promise<PageElement[]> {
    if (this.runtimeDiscoverer) {
      return await this.runtimeDiscoverer.getDiscoveredElements();
    }
    return [];
  }

  async discoverNow(): Promise<PageElement[]> {
    if (this.runtimeDiscoverer) {
      const elements = await this.runtimeDiscoverer.discoverNow();
      this.discoveredElements.push(...elements);
      return elements;
    }
    return [];
  }

  async getDiscoveryStats(): Promise<any> {
    if (this.runtimeDiscoverer) {
      return await this.runtimeDiscoverer.getDiscoveryStats();
    }
    return null;
  }
}

// Create the proper coverage fixture using test.extend
export const test = base.extend<CoverageFixture>({
  // Coverage options that can be configured in playwright.config.ts
  coverageOptions: [{
    outputPath: './coverage-report',
    threshold: 80,
    verbose: false,
    elementDiscovery: true,
    runtimeDiscovery: true, // Enable runtime discovery by default
    captureScreenshots: false
  }, { option: true }],

  // Page fixture with automatic tracking
  page: async ({ page, coverageOptions }, use) => {
    const tracker = new CoverageTracker();

    // Start runtime discovery if enabled
    if (coverageOptions.runtimeDiscovery) {
      await tracker.startRuntimeDiscovery(page, {
        verbose: coverageOptions.verbose,
        includeHidden: false
      });

      if (coverageOptions.verbose) {
        console.log('🔍 Runtime discovery started');
      }
    }

    // Auto-discover elements on page load if enabled
    if (coverageOptions.elementDiscovery) {
      page.on('load', async () => {
        const elements = await tracker.discoverPageElements(page);

        if (coverageOptions.verbose) {
          console.log(`🔍 Discovered ${elements.length} elements on ${page.url()}`);
        }
      });
    }

    await use(page);

    // Stop runtime discovery after test
    if (coverageOptions.runtimeDiscovery) {
      await tracker.stopRuntimeDiscovery();
    }
  },

  // Track interaction fixture
  trackInteraction: async ({ page, coverageOptions }, use) => {
    const tracker = new CoverageTracker();

    await use(async (selector: string, action = 'click') => {
      const stack = new Error().stack;
      let lineNumber = 0;
      let filePath = '';

      if (stack) {
        const lines = stack.split('\n');
        for (const line of lines) {
          if (line.includes('.spec.ts') || line.includes('.test.ts')) {
            const match = line.match(/at\s+.*?\s+\((.*?):(\d+):\d+\)/);
            if (match) {
              filePath = match[1];
              lineNumber = parseInt(match[2], 10);
              break;
            }
          }
        }
      }

      const normalizedSelector = tracker.normalizeSelector(selector);
      const selectorType = tracker.determineSelectorType(selector);

      const testSelector: TestSelector = {
        raw: selector,
        normalized: normalizedSelector,
        type: selectorType,
        lineNumber,
        filePath,
        context: action
      };

      // Avoid duplicates
      const exists = tracker.coveredSelectors.some(s =>
        s.normalized === normalizedSelector && s.filePath === filePath
      );

      if (!exists) {
        tracker.coveredSelectors.push(testSelector);
      }

      if (coverageOptions.verbose) {
        console.log(`🎯 Recorded interaction: ${action} -> ${selector}`);
      }
    });
  },

  // Get covered elements fixture
  getCoveredElements: async ({}, use) => {
    const tracker = new CoverageTracker();
    await use(() => tracker.coveredSelectors);
  },

  // Get discovered elements fixture
  getDiscoveredElements: async ({}, use) => {
    const tracker = new CoverageTracker();
    await use(async () => {
      const staticElements = tracker.discoveredElements;
      const runtimeElements = await tracker.getRuntimeDiscoveredElements();

      // Combine both sets, removing duplicates
      const allElements = [...staticElements];
      const seenSelectors = new Set(staticElements.map(e => e.selector));

      runtimeElements.forEach(element => {
        if (!seenSelectors.has(element.selector)) {
          allElements.push(element);
          seenSelectors.add(element.selector);
        }
      });

      return allElements;
    });
  },

  // Start runtime discovery fixture
  startRuntimeDiscovery: async ({ page }, use) => {
    const tracker = new CoverageTracker();
    await use(async () => {
      await tracker.startRuntimeDiscovery(page, { verbose: true });
    });
  },

  // Stop runtime discovery fixture
  stopRuntimeDiscovery: async ({}, use) => {
    const tracker = new CoverageTracker();
    await use(async () => {
      await tracker.stopRuntimeDiscovery();
    });
  }
});

// Export functions for external access (e.g., from reporters)
export function getGlobalCoverageData(): Map<string, CoverageData> {
  return globalCoverageData;
}

export function clearCoverageData(): void {
  globalCoverageData.clear();
}

export { expect } from '@playwright/test';