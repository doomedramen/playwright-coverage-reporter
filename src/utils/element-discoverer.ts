import { Page } from '@playwright/test';
import { PageElement, ElementType } from '../types';

export class ElementDiscoverer {
  async discoverElements(page: Page): Promise<PageElement[]> {
    return await page.evaluate(() => {
      const elements: any[] = [];

      // Function to get element details
      const getElementDetails = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        const tagName = element.tagName.toLowerCase();

        // Determine element type
        let elementType = tagName;
        if (tagName === 'input') {
          const inputElement = element as HTMLInputElement;
          elementType = inputElement.type || 'text';
        }

        return {
          selector: generateOptimalSelector(element),
          tagName: tagName,
          elementType: elementType,
          text: element.textContent?.trim().substring(0, 100) || '',
          id: element.id || '',
          className: element.className || '',
          xpath: getXPath(element),
          role: element.getAttribute('role') || '',
          accessibleName: getAccessibleName(element),
          title: element.getAttribute('title') || '',
          placeholder: element.getAttribute('placeholder') || '',
          value: (element as HTMLInputElement).value || '',
          isVisible: isElementVisible(element, computedStyle, rect),
          isEnabled: !(element as HTMLInputElement).disabled,
          isInteractive: isElementInteractive(element),
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          attributes: getElementAttributes(element)
        };
      };

      // Check if element is visible
      const isElementVisible = (element: Element, computedStyle: CSSStyleDeclaration, rect: DOMRect) => {
        return computedStyle.display !== 'none' &&
               computedStyle.visibility !== 'hidden' &&
               computedStyle.opacity !== '0' &&
               rect.width > 0 && rect.height > 0;
      };

      // Check if element is interactive
      const isElementInteractive = (element: Element) => {
        const tagName = element.tagName.toLowerCase();
        const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
        const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'option'];

        return interactiveTags.includes(tagName) ||
               interactiveRoles.includes(element.getAttribute('role') || '') ||
               element.getAttribute('onclick') !== null ||
               element.getAttribute('onmousedown') !== null ||
               element.getAttribute('onmouseup') !== null ||
               element.getAttribute('onchange') !== null ||
               element.getAttribute('onsubmit') !== null ||
               (element as any).tabIndex >= 0;
      };

      // Get accessible name for element
      const getAccessibleName = (element: Element): string => {
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
          const labelElement = document.getElementById(ariaLabelledBy);
          if (labelElement) return labelElement.textContent?.trim() || '';
        }

        const title = element.getAttribute('title');
        if (title) return title;

        const placeholder = element.getAttribute('placeholder');
        if (placeholder) return placeholder;

        // For certain elements, use text content
        const tagName = element.tagName.toLowerCase();
        if (['button', 'a', 'option'].includes(tagName)) {
          return element.textContent?.trim() || '';
        }

        // Check for associated label
        if (tagName === 'input') {
          const id = element.id;
          if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) return label.textContent?.trim() || '';
          }
        }

        return '';
      };

      // Get element attributes
      const getElementAttributes = (element: Element) => {
        const attrs: Record<string, string> = {};
        const attributes = element.attributes;
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i];
          attrs[attr.name] = attr.value;
        }
        return attrs;
      };

      // Generate optimal selector (prefer stable selectors)
      const generateOptimalSelector = (element: Element): string => {
        // 1. Test ID is most stable
        const testId = element.getAttribute('data-testid') ||
                     element.getAttribute('test-id') ||
                     element.getAttribute('data-test');
        if (testId) {
          return `[data-testid="${testId}"]`;
        }

        // 2. ID is next best
        if (element.id) {
          return `#${element.id}`;
        }

        // 3. Use combination of tag + class for better specificity
        if (element.className) {
          const classes = element.className.split(' ').filter(c => c.trim());
          if (classes.length > 0) {
            const firstTwoClasses = classes.slice(0, 2).join('.');
            return `${element.tagName.toLowerCase()}.${firstTwoClasses}`;
          }
        }

        // 4. Use tag + role
        const role = element.getAttribute('role');
        if (role) {
          return `${element.tagName.toLowerCase()}[role="${role}"]`;
        }

        // 5. Use tag + text content for buttons/links
        const tagName = element.tagName.toLowerCase();
        if (['button', 'a'].includes(tagName)) {
          const text = element.textContent?.trim();
          if (text && text.length < 50) {
            return `${tagName}:text("${text}")`;
          }
        }

        // 6. Use tag + type for inputs
        if (tagName === 'input') {
          const type = (element as HTMLInputElement).type;
          const placeholder = element.getAttribute('placeholder');
          if (placeholder && placeholder.length < 30) {
            return `${tagName}[placeholder="${placeholder}"]`;
          }
          if (type && type !== 'text') {
            return `${tagName}[type="${type}"]`;
          }
        }

        // 7. Generate CSS path
        return generateCSSPath(element);
      };

      // Generate CSS path
      const generateCSSPath = (element: Element): string => {
        const path: string[] = [];
        let current: Element | null = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let selector = current.tagName.toLowerCase();

          if (current.id) {
            selector = `#${current.id}`;
            path.unshift(selector);
            break;
          } else {
            let sibling = current;
            let index = 1;
            while (sibling.previousElementSibling) {
              sibling = sibling.previousElementSibling;
              if (sibling.tagName === current.tagName) {
                index++;
              }
            }
            if (index > 1) {
              selector += `:nth-of-type(${index})`;
            }
          }

          path.unshift(selector);
          current = current.parentElement;
        }

        return path.join(' > ');
      };

      // Generate XPath
      const getXPath = (element: Element): string => {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }

        const parts: string[] = [];
        let current: Element | null = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 0;
          let sibling: Node | null = current.previousSibling;

          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
              index++;
            }
            sibling = sibling.previousSibling;
          }

          const tagName = current.nodeName.toLowerCase();
          const pathIndex = index > 0 ? `[${index + 1}]` : '';
          parts.unshift(`${tagName}${pathIndex}`);

          current = current.parentElement;
        }

        return '/' + parts.join('/');
      };

      // Find all interactive elements using comprehensive selectors
      const interactiveSelectors = [
        // Standard form elements
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',

        // Links
        'a[href]',

        // Interactive elements by role
        '[role="button"]:not([aria-disabled="true"])',
        '[role="link"]:not([aria-disabled="true"])',
        '[role="menuitem"]:not([aria-disabled="true"])',
        '[role="tab"]:not([aria-disabled="true"])',
        '[role="checkbox"]:not([aria-disabled="true"])',
        '[role="radio"]:not([aria-disabled="true"])',
        '[role="option"]:not([aria-disabled="true"])',

        // Elements with event handlers
        '[onclick]:not([disabled])',
        '[onmousedown]:not([disabled])',
        '[onmouseup]:not([disabled])',
        '[onchange]:not([disabled])',
        '[onsubmit]:not([disabled])',

        // Focusable elements
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',

        // Common interactive patterns
        'details summary',
        'area[href]',
        'iframe',
        'embed',
        'object'
      ];

      const discoveredElements = new Set<string>();

      interactiveSelectors.forEach(selector => {
        try {
          const foundElements = document.querySelectorAll(selector);
          foundElements.forEach(element => {
            const elementKey = `${element.tagName}-${element.id || ''}-${element.className || ''}`;
            if (!discoveredElements.has(elementKey)) {
              discoveredElements.add(elementKey);
              elements.push(getElementDetails(element));
            }
          });
        } catch (error) {
          // Ignore invalid selectors
        }
      });

      // Sort elements by visibility and importance
      elements.sort((a, b) => {
        // Prioritize visible and enabled elements
        if (a.isVisible && !b.isVisible) return -1;
        if (!a.isVisible && b.isVisible) return 1;

        if (a.isEnabled && !b.isEnabled) return -1;
        if (!a.isEnabled && b.isEnabled) return 1;

        // Prioritize elements with accessible names
        if (a.accessibleName && !b.accessibleName) return -1;
        if (!a.accessibleName && b.accessibleName) return 1;

        return 0;
      });

      return elements;
    });
  }

  determineElementType(tagName: string, elementType: string, role: string): ElementType {
    const tag = tagName.toLowerCase();
    const type = elementType.toLowerCase();

    switch (tag) {
      case 'button':
        return ElementType.BUTTON;
      case 'input':
        if (type === 'checkbox') return ElementType.CHECKBOX;
        if (type === 'radio') return ElementType.RADIO;
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

    return ElementType.CLICKABLE_ELEMENT;
  }

  async convertDiscoveredElements(discoveredElements: any[]): Promise<PageElement[]> {
    return discoveredElements.map(element => ({
      selector: element.selector,
      type: this.determineElementType(element.tagName, element.elementType, element.role),
      text: element.text,
      id: element.id,
      class: element.className,
      xpath: element.xpath,
      role: element.role,
      accessibleName: element.accessibleName,
      isVisible: element.isVisible,
      isEnabled: element.isEnabled,
      boundingBox: element.boundingBox
    }));
  }
}