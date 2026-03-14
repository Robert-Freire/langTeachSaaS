import { Browser, BrowserContext } from '@playwright/test';

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

    await page.goto('http://localhost:5173');
    await page.fill('[name="username"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('[name="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('[name="action"]');
    await page.waitForURL('**/dashboard');
    await page.close();

    return context;
}
