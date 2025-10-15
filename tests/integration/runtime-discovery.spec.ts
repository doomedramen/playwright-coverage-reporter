import { test, expect } from '../../src/fixtures/coverage-fixture';

test.describe('Runtime Element Discovery', () => {
  test('should discover elements that appear dynamically during test execution', async ({ page, getDiscoveredElements, trackInteraction, coverageOptions }) => {
    // Navigate to the dynamic test page
    await page.goto('/dynamic.html');

    // Initially, we should only see the basic buttons
    let initialElements = await getDiscoveredElements();
    console.log(`🔍 Initial elements found: ${initialElements.length}`);

    // Verify initial state - should have the main toggle buttons
    const hasToggleButton = initialElements.some(el => el.selector.includes('toggle-section'));
    const hasAddFormButton = initialElements.some(el => el.selector.includes('add-form'));
    const hasOpenModalButton = initialElements.some(el => el.selector.includes('open-modal'));

    expect(hasToggleButton).toBe(true);
    expect(hasAddFormButton).toBe(true);
    expect(hasOpenModalButton).toBe(true);

    // The hidden section should NOT be discovered initially (it's display: none)
    const hasHiddenSection = initialElements.some(el => el.selector.includes('hidden-section'));
    expect(hasHiddenSection).toBe(false);

    // Track interaction with toggle button
    await trackInteraction('#toggle-section', 'click');
    await page.click('#toggle-section');

    // Wait a moment for the mutation observer to detect changes
    await page.waitForTimeout(100);

    // Now discover elements again - should find the newly revealed elements
    const afterToggleElements = await getDiscoveredElements();
    console.log(`🔍 Elements after toggle: ${afterToggleElements.length}`);

    // Should now have more elements, including the hidden section
    expect(afterToggleElements.length).toBeGreaterThan(initialElements.length);

    const hasHiddenSectionAfter = afterToggleElements.some(el => el.selector.includes('hidden-section'));
    const hasActionBtn1 = afterToggleElements.some(el => el.selector.includes('action-btn-1'));
    const hasActionBtn2 = afterToggleElements.some(el => el.selector.includes('action-btn-2'));
    const hasDynamicInput = afterToggleElements.some(el => el.selector.includes('dynamic-input'));

    expect(hasHiddenSectionAfter).toBe(true);
    expect(hasActionBtn1).toBe(true);
    expect(hasActionBtn2).toBe(true);
    expect(hasDynamicInput).toBe(true);

    // Test interactions with the newly discovered elements
    await trackInteraction('#action-btn-1', 'click');
    await page.click('#action-btn-1');

    await trackInteraction('#dynamic-input', 'fill');
    await page.fill('#dynamic-input', 'Test input value');

    // Hide the section again
    await trackInteraction('#toggle-section', 'click');
    await page.click('#toggle-section');

    await page.waitForTimeout(100);

    // Add dynamic form
    await trackInteraction('#add-form', 'click');
    await page.click('#add-form');

    await page.waitForTimeout(100);

    // Should discover form elements that were added dynamically
    const afterFormElements = await getDiscoveredElements();
    console.log(`🔍 Elements after adding form: ${afterFormElements.length}`);

    const hasDynamicName = afterFormElements.some(el => el.selector.includes('dynamic-name'));
    const hasDynamicEmail = afterFormElements.some(el => el.selector.includes('dynamic-email'));
    const hasDynamicRole = afterFormElements.some(el => el.selector.includes('dynamic-role'));
    const hasDynamicSubmit = afterFormElements.some(el => el.selector.includes('dynamic-submit'));

    expect(hasDynamicName).toBe(true);
    expect(hasDynamicEmail).toBe(true);
    expect(hasDynamicRole).toBe(true);
    expect(hasDynamicSubmit).toBe(true);

    // Test the dynamic form
    await trackInteraction('#dynamic-name', 'fill');
    await page.fill('#dynamic-name', 'John Doe');

    await trackInteraction('#dynamic-email', 'fill');
    await page.fill('#dynamic-email', 'john@example.com');

    await trackInteraction('#dynamic-role', 'select');
    await page.selectOption('#dynamic-role', 'user');

    await trackInteraction('#dynamic-submit', 'click');
    await page.click('#dynamic-submit');

    // Verify success message appears
    await expect(page.locator('.success-message')).toContainText('Dynamic form submitted successfully!');

    // Test modal functionality
    await trackInteraction('#open-modal', 'click');
    await page.click('#open-modal');

    await page.waitForTimeout(100);

    const afterModalElements = await getDiscoveredElements();
    console.log(`🔍 Elements after opening modal: ${afterModalElements.length}`);

    // Should discover modal elements
    const hasModal = afterModalElements.some(el => el.selector.includes('modal'));
    const hasModalEmail = afterModalElements.some(el => el.selector.includes('modal-email'));
    const hasModalMessage = afterModalElements.some(el => el.selector.includes('modal-message'));
    const hasModalSubmit = afterModalElements.some(el => el.selector.includes('modal-submit'));
    const hasModalCancel = afterModalElements.some(el => el.selector.includes('modal-cancel'));

    expect(hasModal).toBe(true);
    expect(hasModalEmail).toBe(true);
    expect(hasModalMessage).toBe(true);
    expect(hasModalSubmit).toBe(true);
    expect(hasModalCancel).toBe(true);

    // Test modal interactions
    await trackInteraction('#modal-email', 'fill');
    await page.fill('#modal-email', 'modal@test.com');

    await trackInteraction('#modal-message', 'fill');
    await page.fill('#modal-message', 'Test modal message');

    await trackInteraction('#modal-submit', 'click');
    await page.click('#modal-submit');

    // Modal should close
    await expect(page.locator('#modal')).toHaveClass('hidden');

    if (coverageOptions.verbose) {
      console.log('✅ Runtime discovery test completed successfully');
      console.log(`📊 Total elements discovered: ${afterModalElements.length}`);
      console.log('📝 All interactions tracked successfully');
    }
  });

  test('should handle tab switching and discover tab-specific elements', async ({ page, getDiscoveredElements, trackInteraction }) => {
    await page.goto('/dynamic.html');

    // Initially only Tab 1 content should be discoverable
    let initialElements = await getDiscoveredElements();
    const hasTab1Content = initialElements.some(el => el.selector.includes('tab1-content'));
    const hasTab1Action = initialElements.some(el => el.selector.includes('tab1-action'));
    const hasTab2Content = initialElements.some(el => el.selector.includes('tab2-content'));
    const hasTab3Content = initialElements.some(el => el.selector.includes('tab3-content'));

    expect(hasTab1Content).toBe(true);
    expect(hasTab1Action).toBe(true);
    expect(hasTab2Content).toBe(false); // Tab 2 content is hidden initially
    expect(hasTab3Content).toBe(false); // Tab 3 content is hidden initially

    // Switch to Tab 2
    await trackInteraction('[data-testid="tab2"]', 'click');
    await page.click('[data-testid="tab2"]');

    await page.waitForTimeout(100);

    // Should discover Tab 2 content
    const afterTab2Elements = await getDiscoveredElements();
    const hasTab2ContentAfter = afterTab2Elements.some(el => el.selector.includes('tab2-content'));
    const hasTab2Input = afterTab2Elements.some(el => el.selector.includes('tab2-input'));
    const hasTab2Action = afterTab2Elements.some(el => el.selector.includes('tab2-action'));

    expect(hasTab2ContentAfter).toBe(true);
    expect(hasTab2Input).toBe(true);
    expect(hasTab2Action).toBe(true);

    // Interact with Tab 2 elements
    await trackInteraction('#tab2-input', 'fill');
    await page.fill('#tab2-input', 'Tab 2 test');

    await trackInteraction('#tab2-action', 'click');
    await page.click('#tab2-action');

    // Switch to Tab 3
    await trackInteraction('[data-testid="tab3"]', 'click');
    await page.click('[data-testid="tab3"]');

    await page.waitForTimeout(100);

    // Should discover Tab 3 content
    const afterTab3Elements = await getDiscoveredElements();
    const hasTab3ContentAfter = afterTab3Elements.some(el => el.selector.includes('tab3-content'));
    const hasTab3Select = afterTab3Elements.some(el => el.selector.includes('tab3-select'));

    expect(hasTab3ContentAfter).toBe(true);
    expect(hasTab3Select).toBe(true);

    // Interact with Tab 3 elements
    await trackInteraction('#tab3-select', 'select');
    await page.selectOption('#tab3-select', 'Option 2');

    console.log('✅ Tab switching test completed successfully');
  });

  test('should handle accordion expansion and discover accordion content', async ({ page, getDiscoveredElements, trackInteraction }) => {
    await page.goto('/dynamic.html');

    // Initially accordion content should be hidden
    let initialElements = await getDiscoveredElements();
    const hasAccordion1Content = initialElements.some(el => el.selector.includes('accordion-1-content'));
    const hasAccordion2Content = initialElements.some(el => el.selector.includes('accordion-2-content'));
    const hasAccordion3Content = initialElements.some(el => el.selector.includes('accordion-3-content'));

    expect(hasAccordion1Content).toBe(false);
    expect(hasAccordion2Content).toBe(false);
    expect(hasAccordion3Content).toBe(false);

    // But accordion headers should be discoverable
    const hasAccordion1Header = initialElements.some(el => el.selector.includes('accordion-1-header'));
    const hasAccordion2Header = initialElements.some(el => el.selector.includes('accordion-2-header'));
    const hasAccordion3Header = initialElements.some(el => el.selector.includes('accordion-3-header'));

    expect(hasAccordion1Header).toBe(true);
    expect(hasAccordion2Header).toBe(true);
    expect(hasAccordion3Header).toBe(true);

    // Expand first accordion
    await trackInteraction('[data-testid="accordion-1-header"]', 'click');
    await page.click('[data-testid="accordion-1-header"]');

    await page.waitForTimeout(100);

    // Should discover first accordion content
    const afterAccordion1Elements = await getDiscoveredElements();
    const hasAccordion1ContentAfter = afterAccordion1Elements.some(el => el.selector.includes('accordion-1-content'));
    const hasAccordion1Btn = afterAccordion1Elements.some(el => el.selector.includes('accordion-1-btn'));

    expect(hasAccordion1ContentAfter).toBe(true);
    expect(hasAccordion1Btn).toBe(true);

    // Expand second accordion
    await trackInteraction('[data-testid="accordion-2-header"]', 'click');
    await page.click('[data-testid="accordion-2-header"]');

    await page.waitForTimeout(100);

    // Should discover second accordion content
    const afterAccordion2Elements = await getDiscoveredElements();
    const hasAccordion2ContentAfter = afterAccordion2Elements.some(el => el.selector.includes('accordion-2-content'));
    const hasAccordion2Checkbox = afterAccordion2Elements.some(el => el.selector.includes('accordion-2-checkbox'));

    expect(hasAccordion2ContentAfter).toBe(true);
    expect(hasAccordion2Checkbox).toBe(true);

    // Interact with accordion elements
    await trackInteraction('#accordion-1-btn', 'click');
    await page.click('#accordion-1-btn');

    await trackInteraction('#accordion-2-checkbox', 'check');
    await page.check('#accordion-2-checkbox');

    // Expand third accordion
    await trackInteraction('[data-testid="accordion-3-header"]', 'click');
    await page.click('[data-testid="accordion-3-header"]');

    await page.waitForTimeout(100);

    // Should discover third accordion content
    const afterAccordion3Elements = await getDiscoveredElements();
    const hasAccordion3ContentAfter = afterAccordion3Elements.some(el => el.selector.includes('accordion-3-content'));
    const hasAccordion3Textarea = afterAccordion3Elements.some(el => el.selector.includes('accordion-3-textarea'));

    expect(hasAccordion3ContentAfter).toBe(true);
    expect(hasAccordion3Textarea).toBe(true);

    // Interact with third accordion
    await trackInteraction('#accordion-3-textarea', 'fill');
    await page.fill('#accordion-3-textarea', 'Accordion test content');

    console.log('✅ Accordion test completed successfully');
  });

  test('should provide comprehensive coverage statistics for dynamic elements', async ({ page, getDiscoveredElements, trackInteraction }) => {
    await page.goto('/dynamic.html');

    // Get initial element count
    const initialElements = await getDiscoveredElements();
    console.log(`📊 Initial element count: ${initialElements.length}`);

    // Perform a series of interactions that reveal dynamic content
    const interactions = [
      { selector: '#toggle-section', action: 'click', description: 'Toggle hidden section' },
      { selector: '#add-form', action: 'click', description: 'Add dynamic form' },
      { selector: '#open-modal', action: 'click', description: 'Open modal' },
      { selector: '[data-testid="tab2"]', action: 'click', description: 'Switch to tab 2' },
      { selector: '[data-testid="tab3"]', action: 'click', description: 'Switch to tab 3' },
      { selector: '[data-testid="accordion-1-header"]', action: 'click', description: 'Expand accordion 1' },
      { selector: '[data-testid="accordion-2-header"]', action: 'click', description: 'Expand accordion 2' },
      { selector: '[data-testid="accordion-3-header"]', action: 'click', description: 'Expand accordion 3' }
    ];

    // Perform all interactions
    for (const interaction of interactions) {
      await trackInteraction(interaction.selector, interaction.action);
      await page.click(interaction.selector);
      await page.waitForTimeout(50); // Small delay for DOM changes
    }

    // Get final element count
    const finalElements = await getDiscoveredElements();
    console.log(`📊 Final element count: ${finalElements.length}`);
    console.log(`📈 Element increase: ${finalElements.length - initialElements.length} new elements discovered`);

    // Verify significant increase in discovered elements
    expect(finalElements.length).toBeGreaterThan(initialElements.length + 10);

    // Verify specific dynamic elements were discovered
    const dynamicElements = [
      'hidden-section', 'action-btn-1', 'action-btn-2', 'dynamic-input',
      'dynamic-name', 'dynamic-email', 'dynamic-role', 'dynamic-submit',
      'modal', 'modal-email', 'modal-message', 'modal-submit', 'modal-cancel',
      'tab2-content', 'tab2-input', 'tab2-action',
      'tab3-content', 'tab3-select',
      'accordion-1-content', 'accordion-1-btn',
      'accordion-2-content', 'accordion-2-checkbox',
      'accordion-3-content', 'accordion-3-textarea'
    ];

    const discoveredDynamicElements = [];
    for (const element of dynamicElements) {
      if (finalElements.some(el => el.selector.includes(element))) {
        discoveredDynamicElements.push(element);
      }
    }

    console.log(`🎯 Dynamic elements discovered: ${discoveredDynamicElements.length}/${dynamicElements.length}`);

    // Should have discovered most dynamic elements
    expect(discoveredDynamicElements.length).toBeGreaterThan(dynamicElements.length * 0.8);

    // Generate coverage report summary
    console.log('\n📊 Runtime Discovery Coverage Summary:');
    console.log(`  Initial elements: ${initialElements.length}`);
    console.log(`  Final elements: ${finalElements.length}`);
    console.log(`  New elements discovered: ${finalElements.length - initialElements.length}`);
    console.log(`  Discovery efficiency: ${Math.round((discoveredDynamicElements.length / dynamicElements.length) * 100)}%`);
    console.log(`  Total interactions tracked: ${interactions.length}`);
  });
});