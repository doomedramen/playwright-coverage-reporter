import { StaticAnalyzer } from './src/analyzers/static-analyzer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

async function debugStaticAnalyzer() {
  const tempDirPath = tmpdir();
  if (!tempDirPath) {
    console.error('tmpdir() returned undefined');
    return;
  }

  const tempDir = mkdirSync(join(tempDirPath, 'debug-static-analyzer'), { recursive: true });
  const analyzer = new StaticAnalyzer();

  // Test case from failing test
  const testFile = join(tempDir, 'test-content.ts');
  const testContent = `
import { test, expect } from '@playwright/test';

test('should handle form interactions', async ({ page }) => {
  // Test remember me checkbox
  await page.getByLabel('Remember me').check();
  await expect(page.getByLabel('Remember me')).toBeChecked();

  // Test forgot password link
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL('/forgot-password');

  // Test social login buttons
  await page.getByRole('button', { name: 'Login with Google' }).click();
  await page.getByRole('button', { name: 'Login with GitHub' }).click();
});
`;

  writeFileSync(testFile, testContent);

  try {
    const result = await analyzer.analyzeFile(testFile);
    console.log('Extracted selectors:');
    console.log('Count:', result.length);
    result.forEach((selector, index) => {
      console.log(`${index + 1}. Raw: "${selector.raw}"`);
      console.log(`   Normalized: "${selector.normalized}"`);
      console.log(`   Type: ${selector.type}`);
      console.log(`   Line: ${selector.lineNumber}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

debugStaticAnalyzer();