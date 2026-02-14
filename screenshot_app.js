const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to login page...');
    await page.goto('https://chipper-parfait-9568f8.netlify.app/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotsDir, '01-login-page.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 01-login-page.png');

    // Check if we need to click a register/signup link
    console.log('\n2. Looking for registration option...');
    
    // Look for register/signup button or link
    const registerButton = page.locator('text=/register|sign up|create account/i').first();
    if (await registerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await registerButton.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(screenshotsDir, '02-register-page.png'), fullPage: true });
      console.log('   ✓ Screenshot saved: 02-register-page.png');
    }

    // Fill in registration form
    console.log('\n3. Filling registration form...');
    await page.fill('input[type="email"], input[name="email"]', 'reviewer@test.com');
    await page.screenshot({ path: path.join(screenshotsDir, '03-email-filled.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 03-email-filled.png');

    await page.fill('input[type="password"], input[name="password"]', 'ReviewPass123!');
    await page.screenshot({ path: path.join(screenshotsDir, '04-password-filled.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 04-password-filled.png');

    // Click submit button
    console.log('\n4. Submitting registration form...');
    const submitButton = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Create Account")').first();
    await submitButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for any animations
    await page.screenshot({ path: path.join(screenshotsDir, '05-after-registration.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 05-after-registration.png');

    // Screenshot the dashboard
    console.log('\n5. Dashboard page...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '06-dashboard.png'), fullPage: true });
    console.log('   ✓ Screenshot saved: 06-dashboard.png');

    // Navigate to JWT Generator tab
    console.log('\n6. Navigating to JWT Generator tab...');
    const jwtTab = page.locator('text=/jwt generator/i, a:has-text("JWT"), button:has-text("JWT")').first();
    if (await jwtTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await jwtTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '07-jwt-generator.png'), fullPage: true });
      console.log('   ✓ Screenshot saved: 07-jwt-generator.png');
    } else {
      console.log('   ⚠ JWT Generator tab not found');
    }

    // Navigate to Settings tab
    console.log('\n7. Navigating to Settings tab...');
    const settingsTab = page.locator('text=/settings/i, a:has-text("Settings"), button:has-text("Settings")').first();
    if (await settingsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '08-settings.png'), fullPage: true });
      console.log('   ✓ Screenshot saved: 08-settings.png');
    } else {
      console.log('   ⚠ Settings tab not found');
    }

    // Look for any other navigation items
    console.log('\n8. Looking for other navigation items...');
    const navItems = await page.locator('nav a, nav button, [role="navigation"] a, [role="navigation"] button').all();
    console.log(`   Found ${navItems.length} navigation items`);
    
    for (let i = 0; i < navItems.length && i < 5; i++) {
      try {
        const text = await navItems[i].textContent();
        if (text && text.trim() && !text.match(/logout|sign out/i)) {
          console.log(`\n9.${i + 1}. Clicking navigation item: ${text.trim()}`);
          await navItems[i].click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          await page.screenshot({ 
            path: path.join(screenshotsDir, `09-${i + 1}-${text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`), 
            fullPage: true 
          });
          console.log(`   ✓ Screenshot saved`);
        }
      } catch (err) {
        console.log(`   ⚠ Could not navigate to item ${i + 1}`);
      }
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('❌ Error during screenshot process:', error.message);
    await page.screenshot({ path: path.join(screenshotsDir, 'error-state.png'), fullPage: true });
  } finally {
    await browser.close();
  }
})();
