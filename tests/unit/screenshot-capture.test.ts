import { ScreenshotCapture } from '../../src/utils/screenshot-capture';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Screenshot Capture Utility', () => {
  it('should have proper utility methods defined', () => {
    expect(ScreenshotCapture).toBeDefined();
    expect(typeof ScreenshotCapture.captureElementScreenshot).toBe('function');
    expect(typeof ScreenshotCapture.captureMultipleScreenshots).toBe('function');
    expect(typeof ScreenshotCapture.capturePageScreenshot).toBe('function');
    expect(typeof ScreenshotCapture.captureUncoveredElementScreenshots).toBe('function');
  });

  it('should export ScreenshotCapture utility', () => {
    // This test just verifies that the ScreenshotCapture utility was properly exported
    // The actual functionality will be tested in e2e tests since it requires a browser page
    expect(ScreenshotCapture).toBeDefined();
  });
});