import { Page } from '@playwright/test';
import { PageElement, ElementType } from '../types';

interface RuntimeDiscoveryOptions {
  verbose?: boolean;
  includeHidden?: boolean;
  customSelectors?: string[];
  excludeSelectors?: string[];
}

interface DiscoveredElements {
  elements: PageElement[];
  timestamp: number;
  url: string;
}

export class RuntimeElementDiscoverer {
  private page: Page;
  private options: RuntimeDiscoveryOptions;
  private discoveredElements: Map<string, DiscoveredElements> = new Map();
  private mutationObserverActive = false;

  constructor(page: Page, options: RuntimeDiscoveryOptions = {}) {
    this.page = page;
    this.options = {
      verbose: false,
      includeHidden: false,
      customSelectors: [],
      excludeSelectors: ['[aria-hidden="true"]', '.test-only', '[data-skip-coverage]'],
      ...options
    };
  }

  /**
   * Start monitoring DOM changes for new interactive elements
   */
  async startMonitoring(): Promise<void> {
    if (this.mutationObserverActive) {
      if (this.options.verbose) {
        console.log('🔍 Runtime discovery already active');
      }
      return;
    }

    // Setup MutationObserver in the page context
    await this.page.evaluate((options) => {
      // Clean up existing observer
      if ((window as any).__coverageObserver) {
        (window as any).__coverageObserver.disconnect();
      }

      // Default interactive element selectors
      const interactiveSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[role="button"]:not([disabled])',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="option"]',
        '[role="tab"]',
        '[onclick]',
        '[onchange]',
        '[onsubmit]',
        '[data-testid]',
        '[data-test]',
        'details', // Collapsible content
        'summary', // Details summary
        '[contenteditable="true"]',
        ...options.customSelectors
      ];

      // Function to discover elements
      const discoverElements = (): any[] => {
        const elements: any[] = [];
        const processedElements = new Set<Element>();

        interactiveSelectors.forEach(selector => {
          try {
            const foundElements = document.querySelectorAll(selector);
            foundElements.forEach(element => {
              const htmlElement = element as HTMLElement;

              // Skip duplicates
              if (processedElements.has(element)) return;
              processedElements.add(element);

              // Check if element should be excluded
              const shouldExclude = options.excludeSelectors.some(excludeSelector => {
                try {
                  return htmlElement.matches(excludeSelector);
                } catch {
                  return false;
                }
              });

              if (shouldExclude) return;

              const computedStyle = window.getComputedStyle(htmlElement);
              const isVisible = options.includeHidden || (
                computedStyle.display !== 'none' &&
                computedStyle.visibility !== 'hidden' &&
                computedStyle.opacity !== '0' &&
                htmlElement.offsetWidth > 0 &&
                htmlElement.offsetHeight > 0
              );

              const isEnabled = !htmlElement.hasAttribute('disabled') &&
                               htmlElement.getAttribute('aria-disabled') !== 'true';

              if (isVisible) {
                const rect = htmlElement.getBoundingClientRect();

                elements.push({
                  selector: (window as any).__coverageHelpers.getElementSelector(htmlElement),
                  type: (window as any).__coverageHelpers.getElementType(htmlElement),
                  text: htmlElement.textContent?.trim() || '',
                  id: htmlElement.id,
                  className: htmlElement.className,
                  role: htmlElement.getAttribute('role'),
                  isVisible: isVisible,
                  isEnabled: isEnabled,
                  boundingBox: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                  },
                  discoverySource: 'runtime-mutation',
                  discoveryContext: `${Date.now()}-${window.location.href}-${(window as any).__coverageHelpers.getParentSelector(htmlElement)}`
                });
              }
            });
          } catch (error) {
            console.warn('⚠️ Error in selector:', selector, error);
          }
        });

        return elements;
      };

      // Helper functions
      (window as any).__coverageHelpers = {
        getElementSelector: (element: HTMLElement): string => {
          // Priority order for selectors
          if (element.id) return `#${element.id}`;
          if (element.getAttribute('data-testid')) return `[data-testid="${element.getAttribute('data-testid')}"]`;
          if (element.getAttribute('data-test')) return `[data-test="${element.getAttribute('data-test')}"]`;
          if (element.className) return `.${element.className.split(' ').join('.')}`;

          // Generate CSS selector path as fallback
          const path = [];
          let current = element;

          while (current && current.nodeType === Node.ELEMENT_NODE) {
            let selector = current.nodeName.toLowerCase();

            if (current.id) {
              selector = `#${current.id}`;
              path.unshift(selector);
              break;
            } else {
              let sibling = current;
              let index = 1;

              while (sibling.previousElementSibling) {
                sibling = sibling.previousElementSibling as HTMLElement;
                if (sibling.nodeName === current.nodeName) {
                  index++;
                }
              }

              if (index > 1) {
                selector = `${selector}:nth-of-type(${index})`;
              }

              path.unshift(selector);
              current = current.parentElement as HTMLElement;
            }
          }

          return path.join(' > ');
        },

        getElementType: (element: HTMLElement): string => {
          const tagName = element.tagName.toLowerCase();
          const role = element.getAttribute('role');

          // Determine element type based on role first
          if (role === 'button') return 'button';
          if (role === 'link') return 'link';
          if (role === 'textbox' || role === 'searchbox') return 'input';
          if (role === 'combobox') return 'select';

          // Then by tag name and attributes
          if (tagName === 'button') return 'button';
          if (tagName === 'input') {
            const type = element.getAttribute('type');
            if (type === 'checkbox') return 'checkbox';
            if (type === 'radio') return 'radio';
            return 'input';
          }
          if (tagName === 'a') return 'link';
          if (tagName === 'select') return 'select';
          if (tagName === 'textarea') return 'textarea';
          if (tagName === 'details') return 'interactive-element';
          if (tagName === 'summary') return 'interactive-element';
          if (element.contentEditable === 'true') return 'input';

          return 'interactive-element';
        },

        getParentSelector: (element: HTMLElement): string => {
          if (element.parentElement) {
            return (window as any).__coverageHelpers.getElementSelector(element.parentElement);
          }
          return 'body';
        }
      };

      // Create MutationObserver
      const observer = new MutationObserver((mutations) => {
        let hasRelevantChanges = false;

        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Check if any added nodes are interactive elements
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                if (element.matches(interactiveSelectors.join(',')) ||
                    element.querySelector(interactiveSelectors.join(','))) {
                  hasRelevantChanges = true;
                }
              }
            });
          } else if (mutation.type === 'attributes') {
            // Check if attribute changes affect interactivity
            const element = mutation.target as Element;
            if (element.matches(interactiveSelectors.join(','))) {
              hasRelevantChanges = true;
            }
          }
        });

        if (hasRelevantChanges) {
          // Store discovered elements
          const elements = discoverElements();
          const discovery: DiscoveredElements = {
            elements,
            timestamp: Date.now(),
            url: window.location.href
          };

          // Store in window for later retrieval
          if (!(window as any).__coverageDiscoveries) {
            (window as any).__coverageDiscoveries = [];
          }
          (window as any).__coverageDiscoveries.push(discovery);

          // Log if verbose
          if (options.verbose) {
            console.log(`🔍 Runtime discovery: ${elements.length} elements found at ${new Date().toISOString()}`);
          }
        }
      });

      // Start observing
      observer.observe(document.body, {
        childList: true,      // Watch for added/removed nodes
        subtree: true,        // Watch entire subtree
        attributes: true,     // Watch for attribute changes
        attributeFilter: ['disabled', 'aria-disabled', 'hidden', 'aria-hidden', 'style', 'class']
      });

      (window as any).__coverageObserver = observer;

      // Initial discovery
      const initialElements = discoverElements();
      const initialDiscovery: DiscoveredElements = {
        elements: initialElements,
        timestamp: Date.now(),
        url: window.location.href
      };

      if (!(window as any).__coverageDiscoveries) {
        (window as any).__coverageDiscoveries = [];
      }
      (window as any).__coverageDiscoveries.push(initialDiscovery);

      if (options.verbose) {
        console.log(`🔍 Runtime discovery started: ${initialElements.length} initial elements found`);
      }
    }, this.options);

    this.mutationObserverActive = true;

    if (this.options.verbose) {
      console.log('🔍 Runtime element discovery monitoring started');
    }
  }

  /**
   * Stop monitoring DOM changes
   */
  async stopMonitoring(): Promise<void> {
    if (!this.mutationObserverActive) return;

    await this.page.evaluate(() => {
      if ((window as any).__coverageObserver) {
        (window as any).__coverageObserver.disconnect();
        delete (window as any).__coverageObserver;
      }
    });

    this.mutationObserverActive = false;

    if (this.options.verbose) {
      console.log('🔍 Runtime element discovery monitoring stopped');
    }
  }

  /**
   * Get all discovered elements during monitoring
   */
  async getDiscoveredElements(): Promise<PageElement[]> {
    const discoveries = await this.page.evaluate(() => {
      return (window as any).__coverageDiscoveries || [];
    });

    const allElements: PageElement[] = [];
    const seenSelectors = new Set<string>();

    discoveries.forEach((discovery: DiscoveredElements) => {
      discovery.elements.forEach((element: PageElement) => {
        // Avoid duplicates
        const uniqueKey = `${element.selector}-${element.type}`;
        if (!seenSelectors.has(uniqueKey)) {
          seenSelectors.add(uniqueKey);
          allElements.push({
            ...element,
            discoverySource: element.discoverySource || 'runtime',
            discoveryContext: element.discoveryContext || `${discovery.timestamp}-${discovery.url}`
          });
        }
      });
    });

    return allElements;
  }

  /**
   * Get elements discovered at specific time intervals
   */
  async getDiscoveryTimeline(): Promise<DiscoveredElements[]> {
    return await this.page.evaluate(() => {
      return (window as any).__coverageDiscoveries || [];
    });
  }

  /**
   * Force a discovery scan right now
   */
  async discoverNow(): Promise<PageElement[]> {
    const elements = await this.page.evaluate(() => {
      // Use the same discovery logic as the mutation observer
      const interactiveSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[role="button"]:not([disabled])',
        '[role="link"]',
        '[onclick]',
        '[data-testid]',
        '[data-test]'
      ];

      const elements: any[] = [];
      const processedElements = new Set<Element>();

      interactiveSelectors.forEach(selector => {
        try {
          const foundElements = document.querySelectorAll(selector);
          foundElements.forEach(element => {
            const htmlElement = element as HTMLElement;

            if (processedElements.has(element)) return;
            processedElements.add(element);

            const computedStyle = window.getComputedStyle(htmlElement);
            const isVisible = computedStyle.display !== 'none' &&
                            computedStyle.visibility !== 'hidden' &&
                            htmlElement.offsetWidth > 0 &&
                            htmlElement.offsetHeight > 0;

            if (isVisible) {
              const rect = htmlElement.getBoundingClientRect();

              elements.push({
                selector: (window as any).__coverageHelpers.getElementSelector(htmlElement),
                type: (window as any).__coverageHelpers.getElementType(htmlElement),
                text: htmlElement.textContent?.trim() || '',
                id: htmlElement.id,
                className: htmlElement.className,
                isVisible: true,
                isEnabled: !htmlElement.hasAttribute('disabled'),
                boundingBox: {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height)
                },
                discoverySource: 'runtime-manual',
                discoveryContext: `${Date.now()}-${window.location.href}`
              });
            }
          });
        } catch (error) {
          console.warn('⚠️ Error in selector:', selector, error);
        }
      });

      return elements;
    });

    // Store this discovery
    const discovery: DiscoveredElements = {
      elements,
      timestamp: Date.now(),
      url: this.page.url()
    };

    const discoveryKey = `${discovery.timestamp}-${discovery.url}`;
    this.discoveredElements.set(discoveryKey, discovery);

    return elements.map(element => ({
      ...element,
      discoverySource: element.discoverySource || 'runtime-manual',
      discoveryContext: element.discoveryContext || `${discovery.timestamp}-${discovery.url}`
    }));
  }

  /**
   * Clear all discovered elements
   */
  async clearDiscoveries(): Promise<void> {
    await this.page.evaluate(() => {
      delete (window as any).__coverageDiscoveries;
    });
    this.discoveredElements.clear();

    if (this.options.verbose) {
      console.log('🔍 Runtime discoveries cleared');
    }
  }

  /**
   * Get statistics about discovered elements
   */
  async getDiscoveryStats(): Promise<{
    totalElements: number;
    discoveryCount: number;
    elementTypes: Record<string, number>;
    timeline: Array<{ timestamp: number; count: number; url: string }>;
  }> {
    const discoveries = await this.getDiscoveryTimeline();
    const allElements = await this.getDiscoveredElements();

    const elementTypes: Record<string, number> = {};
    allElements.forEach(element => {
      elementTypes[element.type] = (elementTypes[element.type] || 0) + 1;
    });

    const timeline = discoveries.map(discovery => ({
      timestamp: discovery.timestamp,
      count: discovery.elements.length,
      url: discovery.url
    }));

    return {
      totalElements: allElements.length,
      discoveryCount: discoveries.length,
      elementTypes,
      timeline
    };
  }
}