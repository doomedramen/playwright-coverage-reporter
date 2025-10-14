import { test as base, type Page, type Locator } from '@playwright/test';
import { PageElement, TestSelector, SelectorType, ElementType } from '../types';

export interface CoverageFixture {
  page: Page;
  trackInteraction: (selector: string, action: string) => Promise<void>;
  getCoveredElements: () => TestSelector[];
  startCoverageTracking: () => void;
  stopCoverageTracking: () => Promise<PageElement[]>;
}

class CoverageTracker {
  private coveredSelectors: TestSelector[] = [];
  private isTracking = false;
  private originalGoto: Page['goto'];
  private originalClick: Page['click'];
  private originalFill: Page['fill'];
  private originalType: Page['type'];
  private originalCheck: Page['check'];
  private originalUncheck: Page['uncheck'];
  private originalSelectOption: Page['selectOption'];
  private page?: Page;

  constructor() {
    this.interceptPageMethods = this.interceptPageMethods.bind(this);
  }

  startTracking(page: Page) {
    this.page = page;
    this.isTracking = true;
    this.interceptPageMethods(page);
  }

  stopTracking() {
    this.isTracking = false;
    this.restorePageMethods();
  }

  private interceptPageMethods(page: Page) {
    // Store original methods
    this.originalGoto = page.goto.bind(page);
    this.originalClick = page.click.bind(page);
    this.originalFill = page.fill.bind(page);
    this.originalType = page.type.bind(page);
    this.originalCheck = page.check.bind(page);
    this.originalUncheck = page.uncheck.bind(page);
    this.originalSelectOption = page.selectOption.bind(page);

    // Intercept page.goto to discover elements on page load
    page.goto = async (...args) => {
      const result = await this.originalGoto(...args);
      if (this.isTracking) {
        await this.discoverPageElements(page);
      }
      return result;
    };

    // Intercept click operations
    page.click = async (selector, options) => {
      await this.trackSelector(selector, 'click');
      return this.originalClick(selector, options);
    };

    // Intercept fill operations
    page.fill = async (selector, value, options) => {
      await this.trackSelector(selector, 'fill');
      return this.originalFill(selector, value, options);
    };

    // Intercept type operations
    page.type = async (selector, value, options) => {
      await this.trackSelector(selector, 'type');
      return this.originalType(selector, value, options);
    };

    // Intercept check operations
    page.check = async (selector, options) => {
      await this.trackSelector(selector, 'check');
      return this.originalCheck(selector, options);
    };

    // Intercept uncheck operations
    page.uncheck = async (selector, options) => {
      await this.trackSelector(selector, 'uncheck');
      return this.originalUncheck(selector, options);
    };

    // Intercept select operations
    page.selectOption = async (selector, values, options) => {
      await this.trackSelector(selector, 'selectOption');
      return this.originalSelectOption(selector, values, options);
    };
  }

  private restorePageMethods() {
    if (this.page) {
      this.page.goto = this.originalGoto;
      this.page.click = this.originalClick;
      this.page.fill = this.originalFill;
      this.page.type = this.originalType;
      this.page.check = this.originalCheck;
      this.page.uncheck = this.originalUncheck;
      this.page.selectOption = this.originalSelectOption;
    }
  }

  private async trackSelector(selector: string, action: string) {
    if (!this.isTracking || !this.page) return;

    // Generate stack trace to get calling location
    const stack = new Error().stack;
    let lineNumber = 0;
    let filePath = '';
    let context = '';

    if (stack) {
      const lines = stack.split('\n');
      // Look for the test file in the stack trace
      for (const line of lines) {
        if (line.includes('.spec.ts') || line.includes('.test.ts') || line.includes('.e2e.ts')) {
          const match = line.match(/at\s+.*?\s+\((.*?):(\d+):\d+\)/);
          if (match) {
            filePath = match[1];
            lineNumber = parseInt(match[2], 10);
            break;
          }
        }
      }
    }

    const normalizedSelector = this.normalizeSelector(selector);
    const selectorType = this.determineSelectorType(selector);

    const testSelector: TestSelector = {
      raw: selector,
      normalized: normalizedSelector,
      type: selectorType,
      lineNumber,
      filePath,
      context: action
    };

    // Avoid duplicates
    const exists = this.coveredSelectors.some(s =>
      s.normalized === normalizedSelector && s.filePath === filePath
    );

    if (!exists) {
      this.coveredSelectors.push(testSelector);
    }
  }

  private normalizeSelector(selector: string): string {
    // Remove text content from quotes for normalization
    return selector.replace(/=["'][^"']*["']/g, '="..."');
  }

  private determineSelectorType(selector: string): SelectorType {
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

  private async discoverPageElements(page: Page): Promise<PageElement[]> {
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

    return elements;
  }

  private determineElementType(tagName: string, role: string): ElementType {
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

  getCoveredSelectors(): TestSelector[] {
    return [...this.coveredSelectors];
  }

  clearCoverage() {
    this.coveredSelectors = [];
  }
}

// Create the coverage fixture
export const test = base.extend<CoverageFixture>({
  page: async ({ page }, use) => {
    // This will be handled by the coverage fixture
    await use(page);
  },

  trackInteraction: async ({}, use) => {
    const tracker = new CoverageTracker();
    await use(async (selector: string, action: string) => {
      await tracker['trackSelector'](selector, action);
    });
  },

  getCoveredElements: async ({}, use) => {
    const tracker = new CoverageTracker();
    await use(() => tracker.getCoveredSelectors());
  },

  startCoverageTracking: async ({ page }, use) => {
    const tracker = new CoverageTracker();
    await use(() => {
      tracker.startTracking(page);
    });
  },

  stopCoverageTracking: async ({}, use) => {
    const tracker = new CoverageTracker();
    await use(async () => {
      tracker.stopTracking();
      // Return discovered elements (this would need the page instance)
      return [];
    });
  }
});

export { expect } from '@playwright/test';