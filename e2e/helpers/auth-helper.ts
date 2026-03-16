import { Browser, BrowserContext } from '@playwright/test';

/**
 * Returns a BrowserContext that works with the MockAuth0Provider (VITE_E2E_TEST_MODE=true).
 * The mock provider injects a fixed identity without hitting Auth0.
 */
export async function createMockAuthContext(browser: Browser): Promise<BrowserContext> {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5174';
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(baseURL);
    await page.waitForURL(`${baseURL}/**`, { timeout: 15000 });
    await page.close();
    return context;
}

/**
 * Returns a BrowserContext with a valid Auth0 session.
 * The context retains the session cookie so all pages opened from it are authenticated.
 *
 * Requires in e2e/.env:
 *   E2E_TEST_EMAIL=<test user email>
 *   E2E_TEST_PASSWORD=<test user password>
 */
export async function createAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:5174');
    await page.fill('[name="username"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('[name="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('[name="action"]');

    // Wait for Auth0 to process the login and any redirects to settle
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Handle Auth0 consent screen if it appears.
    // Permanently fix by enabling "Allow Skipping User Consent" on the Auth0 API:
    // Dashboard > Applications > APIs > LangTeach API > Settings > Allow Skipping User Consent
    if (page.url().includes('/u/consent')) {
        const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
        await submitBtn.click();
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }

    // Wait until back on the app
    await page.waitForURL('http://localhost:5174/**', { timeout: 30000 });
    await page.close();

    return context;
}
