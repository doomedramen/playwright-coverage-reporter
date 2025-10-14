import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to main pages', async ({ page }) => {
    // Test navigation menu
    await page.click('nav a[href="/about"]');
    await expect(page).toHaveURL('/about');
    await expect(page.locator('h1:has-text("About Us")')).toBeVisible();

    await page.click('nav a[href="/contact"]');
    await expect(page).toHaveURL('/contact');
    await expect(page.locator('h1:has-text("Contact")')).toBeVisible();

    await page.click('nav a[href="/home"]');
    await expect(page).toHaveURL('/home');
    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible();
  });

  test('should toggle mobile menu', async ({ page }) => {
    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Mobile menu should be hidden initially
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeHidden();

    // Click menu toggle
    await page.click('[data-testid="menu-toggle"]');

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Click menu toggle again
    await page.click('[data-testid="menu-toggle"]');

    // Mobile menu should be hidden again
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeHidden();
  });

  test('should show active navigation state', async ({ page }) => {
    // Navigate to about page
    await page.click('nav a[href="/about"]');

    // About link should be active
    await expect(page.locator('nav a[href="/about"].active')).toBeVisible();

    // Other links should not be active
    await expect(page.locator('nav a[href="/home"].active')).toBeHidden();
    await expect(page.locator('nav a[href="/contact"].active')).toBeHidden();
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    // Navigate to a nested page
    await page.goto('/products/electronics/laptops');

    // Check breadcrumbs
    await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
    await expect(page.locator('a[href="/products"]')).toBeVisible();
    await expect(page.locator('a[href="/products/electronics"]')).toBeVisible();

    // Click breadcrumb link
    await page.click('a[href="/products"]');
    await expect(page).toHaveURL('/products');
  });

  test('should handle browser back and forward', async ({ page }) => {
    // Navigate through several pages
    await page.click('nav a[href="/about"]');
    await page.click('nav a[href="/contact"]');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/about');

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL('/contact');
  });

  test('should handle external links', async ({ page }) => {
    // External link should have correct attributes
    const externalLink = page.locator('a[href*="http"]:not([href*="' + page.url().split('/')[2] + '"])');
    await expect(externalLink).toHaveAttribute('target', '_blank');
    await expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('should handle search navigation', async ({ page }) => {
    // Click search button
    await page.click('[data-testid="search-button"]');

    // Search modal should appear
    await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();

    // Type search query
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.press('[data-testid="search-input"]', 'Enter');

    // Should navigate to search results
    await expect(page).toHaveURL(/search/);
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should handle skip navigation links', async ({ page }) => {
    // Skip links should be visible when focused
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();

    // Press tab to focus skip link
    await page.keyboard.press('Tab');

    // Click skip link
    await skipLink.click();

    // Should jump to main content
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });
});