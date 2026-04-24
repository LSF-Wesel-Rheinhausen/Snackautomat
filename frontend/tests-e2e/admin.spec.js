const { test, expect } = require('@playwright/test');

test.describe('Admin Flow E2E', () => {
    test('Admin login and settings save', async ({ page }) => {
        await page.addInitScript(() => {
            function hashSecret(secret) {
                const normalized = String(secret || '').trim();
                let h1 = 0xdeadbeef ^ normalized.length;
                let h2 = 0x41c6ce57 ^ normalized.length;
                for (let i = 0; i < normalized.length; i++) {
                    const ch = normalized.charCodeAt(i);
                    h1 = Math.imul(h1 ^ ch, 2654435761);
                    h2 = Math.imul(h2 ^ ch, 1597334677);
                }
                h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
                h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
                return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
            }

            localStorage.setItem('snackautomat_apiUrl', 'http://localhost:8124');
            localStorage.setItem('snackautomat_jwtToken', 'test.jwt.token');
            localStorage.setItem('snackautomat_pin_hash', hashSecret('0000'));
            sessionStorage.setItem(
                'snackautomat_currentUser',
                JSON.stringify({ firstName: 'Admin', lastName: 'User', memberId: 'manual' })
            );
        });

        await page.route('**/getValidFUProducts', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    'item-1': { designation: '[1] Test Snack', prices: [{ price: '1.50' }] }
                })
            });
        });

        await page.goto('/');
        await expect(page.locator('#main-app')).toBeVisible();

        await page.click('#tab-admin');
        await expect(page.locator('#admin-login-section')).toBeVisible();

        await page.fill('#admin-pin-input', '0000');
        await page.click('#admin-login-btn');
        await expect(page.locator('#admin-content-section')).toBeVisible();

        await page.fill('#admin-api-url', 'http://localhost:9000');
        await page.fill('#admin-api-jwt', 'new.token.value');
        await page.fill('#admin-new-pin', '1111');
        await page.click('#admin-save-btn');

        const storedUrl = await page.evaluate(() => localStorage.getItem('snackautomat_apiUrl'));
        expect(storedUrl).toBe('http://localhost:9000');

        const storedJwt = await page.evaluate(() => localStorage.getItem('snackautomat_jwtToken'));
        expect(storedJwt).toBe('new.token.value');

        const pinHash = await page.evaluate(() => localStorage.getItem('snackautomat_pin_hash'));
        expect(pinHash).toBeTruthy();
    });
});
