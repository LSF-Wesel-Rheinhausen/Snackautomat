const { test, expect } = require('@playwright/test');

test.describe('Snackautomat Frontend E2E', () => {
    test('Setup and manual login flow', async ({ page }) => {
        await page.route('**/getValidFUProducts', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    'item-1': { designation: '[1] E2E Snack', prices: [{ price: '1.50' }] }
                })
            });
        });

        await page.goto('/');

        await expect(page.locator('#setup-screen')).toBeVisible();
        await page.fill('#setup-api-url', 'http://localhost:8124');
        await page.fill('#setup-api-jwt', 'test-token.jwt.string');
        await page.fill('#setup-admin-pin', '1234');
        await page.fill('#setup-install-password', 'install-secret');
        await page.click('#setup-start-btn');

        await expect(page.locator('#user-login-screen')).toBeVisible();

        await page.fill('#user-firstname', 'End');
        await page.fill('#user-lastname', 'User');
        await page.click('#user-login-btn');

        await expect(page.locator('#main-app')).toBeVisible();
        await expect(page.locator('#user-display-name')).toHaveText('End User');
    });

    test('Booking flow creates local bookings for snack and drink', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('snackautomat_apiUrl', 'http://localhost:8124');
            localStorage.setItem('snackautomat_jwtToken', 'test.jwt.token');
            localStorage.setItem(
                'snackautomat_snacks',
                JSON.stringify([{ id: 1, name: 'Playwright Snack', price: 1.5, rawId: 'item-1' }])
            );
            localStorage.setItem(
                'snackautomat_drinks',
                JSON.stringify([{ id: 1, name: 'Playwright Cola', price: 2.0 }])
            );
            sessionStorage.setItem(
                'snackautomat_currentUser',
                JSON.stringify({ firstName: 'User', lastName: 'End', memberId: 'tester_123' })
            );
        });

        await page.route('**/getValidFUProducts', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    'item-1': { designation: '[1] Playwright Snack', prices: [{ price: '1.50' }] }
                })
            });
        });

        await page.route('**/Buy', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/');
        await expect(page.locator('#main-app')).toBeVisible();

        await page.click('#snack-btn-1');
        await page.click('#tab-drinks');
        await page.click('#drink-btn-1');

        const bookings = await page.evaluate(() => JSON.parse(localStorage.getItem('snackautomat_bookings') || '[]'));
        expect(bookings.length).toBe(2);
        expect(bookings[0].type).toBe('snack');
        expect(bookings[1].type).toBe('drink');
    });
});
