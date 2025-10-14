export interface PageElement {
  selector: string;
  type: ElementType;
  text?: string;
  id?: string;
  class?: string;
  xpath?: string;
  role?: string;
  accessibleName?: string;
  isVisible: boolean;
  isEnabled: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TestSelector {
  raw: string;
  normalized: string;
  type: SelectorType;
  lineNumber: number;
  filePath: string;
  context?: string;
}

export interface CoverageResult {
  totalElements: number;
  coveredElements: number;
  uncoveredElements: PageElement[];
  coveragePercentage: number;
  coverageByType: Record<ElementType, number>;
  elementsByPage: Record<string, {
    total: number;
    covered: number;
    elements: PageElement[];
  }>;
}

export interface CoverageReport {
  summary: {
    totalElements: number;
    coveredElements: number;
    coveragePercentage: number;
    pages: number;
    testFiles: number;
  };
  pages: PageCoverage[];
  uncoveredElements: PageElement[];
  recommendations: string[];
}

export interface PageCoverage {
  url: string;
  elements: PageElement[];
  coverage: CoverageResult;
}

export enum ElementType {
  BUTTON = 'button',
  INPUT = 'input',
  LINK = 'link',
  SELECT = 'select',
  TEXTAREA = 'textarea',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  INTERACTIVE_ELEMENT = 'interactive-element',
  CLICKABLE_ELEMENT = 'clickable-element'
}

export enum SelectorType {
  CSS = 'css',
  XPATH = 'xpath',
  TEXT = 'text',
  ROLE = 'role',
  TEST_ID = 'test-id',
  ALT_TEXT = 'alt-text',
  PLACEHOLDER = 'placeholder',
  LABEL = 'label'
}

export interface PlaywrightCoverConfig {
  include: string[];
  exclude: string[];
  ignoreElements: string[];
  coverageThreshold: number;
  outputPath: string;
  reportFormat: 'html' | 'json' | 'console' | 'all';
  discoverElements: boolean;
  staticAnalysis: boolean;
  runtimeTracking: boolean;
}