import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { Store } = require('../js/store');
globalThis.Store = Store;
global.Store = Store;
window.Store = Store;

globalThis.SnacksView = { render: vi.fn() };
globalThis.DrinksView = { render: vi.fn() };
globalThis.ScannerService = { connect: vi.fn() };
global.SnacksView = globalThis.SnacksView;
global.DrinksView = globalThis.DrinksView;
global.ScannerService = globalThis.ScannerService;
window.SnacksView = globalThis.SnacksView;
window.DrinksView = globalThis.DrinksView;
window.ScannerService = globalThis.ScannerService;

const { AdminView } = require('../js/admin');

describe('AdminView', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        resetSnackautomatDom();
        Store.init();
        Store.setApiConfig('http://localhost:8124', 'a.b.c');
        Store.setPin('1234');
        AdminView.init();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function loginAsAdmin() {
        document.getElementById('admin-pin-input').value = '1234';
        document.getElementById('admin-login-btn').click();
    }

    it('should reject login when no admin pin is configured', () => {
        localStorage.clear();
        Store.init();

        document.getElementById('admin-pin-input').value = '1234';
        document.getElementById('admin-login-btn').click();

        expect(document.getElementById('admin-login-error').textContent).toContain('Keine Admin-PIN');
        expect(document.getElementById('admin-pin-input').value).toBe('');
    });

    it('should reject invalid pins and focus the pin input', () => {
        const focusSpy = vi.spyOn(document.getElementById('admin-pin-input'), 'focus').mockImplementation(() => {});

        document.getElementById('admin-pin-input').value = '0000';
        document.getElementById('admin-login-btn').click();

        expect(document.getElementById('admin-login-error').textContent).toContain('Falscher PIN');
        expect(focusSpy).toHaveBeenCalled();
    });

    it('should login and render admin data', () => {
        loginAsAdmin();

        expect(document.getElementById('admin-login-section').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('admin-content-section').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('admin-api-url').value).toBe('http://localhost:8124');
        expect(document.querySelectorAll('#admin-snack-tbody tr')).toHaveLength(12);
        expect(document.getElementById('admin-booking-history').textContent).toContain('Noch keine Buchungen');
    });

    it('should add a valid drink and refresh the drinks view', () => {
        loginAsAdmin();
        document.getElementById('admin-new-drink-name').value = 'Limo';
        document.getElementById('admin-new-drink-price').value = '2.50';

        document.getElementById('admin-add-drink-btn').click();

        expect(Store.getDrinks().some((drink) => drink.name === 'Limo' && drink.price === 2.5)).toBe(true);
        expect(DrinksView.render).toHaveBeenCalled();
        expect(document.getElementById('admin-new-drink-name').value).toBe('');
    });

    it('should validate save inputs before writing changes', () => {
        const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
        loginAsAdmin();

        document.getElementById('admin-api-url').value = '';
        document.getElementById('admin-save-btn').click();
        expect(alertSpy).toHaveBeenLastCalledWith('Fehler: Die API URL darf nicht leer sein.');

        document.getElementById('admin-api-url').value = 'not-a-url';
        document.getElementById('admin-save-btn').click();
        expect(alertSpy).toHaveBeenLastCalledWith('Fehler: Die eingegebene API URL ist ungültig.');

        document.getElementById('admin-api-url').value = 'http://localhost:8124';
        document.getElementById('admin-api-jwt').value = '';
        document.getElementById('admin-save-btn').click();
        expect(alertSpy).toHaveBeenLastCalledWith('Fehler: JWT-Token darf nicht leer sein.');

        document.getElementById('admin-api-jwt').value = 'invalid';
        document.getElementById('admin-save-btn').click();
        expect(alertSpy).toHaveBeenLastCalledWith('Fehler: Das eingegebene JWT-Token hat kein gültiges Format.');

        document.getElementById('admin-api-jwt').value = 'a.b.c';
        document.getElementById('admin-new-pin').value = '12';
        document.getElementById('admin-save-btn').click();
        expect(alertSpy).toHaveBeenLastCalledWith('Fehler: Die neue Admin-PIN muss aus 4 bis 10 Ziffern bestehen.');
    });

    it('should save API config, PIN, snack edits, and drink edits', () => {
        loginAsAdmin();
        document.getElementById('admin-api-url').value = 'https://api.example.test';
        document.getElementById('admin-api-jwt').value = 'x.y.z';
        document.getElementById('admin-new-pin').value = '4321';
        document.getElementById('admin-snack-name-1').value = 'Neue Waffel';
        document.getElementById('admin-snack-price-1').value = '2.20';
        document.getElementById('admin-drink-name-1').value = 'Neue Cola';
        document.getElementById('admin-drink-price-1').value = '3.30';

        document.getElementById('admin-save-btn').click();

        expect(Store.getApiConfig()).toEqual({ url: 'https://api.example.test', token: 'x.y.z' });
        expect(Store.checkPin('4321')).toBe(true);
        expect(Store.getSnacks()[0]).toMatchObject({ name: 'Neue Waffel', price: 2.2 });
        expect(Store.getDrinks()[0]).toMatchObject({ name: 'Neue Cola', price: 3.3 });
        expect(SnacksView.render).toHaveBeenCalled();
        expect(DrinksView.render).toHaveBeenCalled();

        vi.advanceTimersByTime(2000);
        expect(document.getElementById('admin-save-btn').classList.contains('btn--success')).toBe(false);
    });

    it('should handle booking export and clearing', async () => {
        const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
        loginAsAdmin();

        document.getElementById('admin-export-btn').click();
        await Promise.resolve();
        expect(alertSpy).toHaveBeenCalledWith('Keine Buchungen zum Exportieren vorhanden.');

        Store.addBooking('snack', { name: 'Mars', price: 1.5 });
        vi.spyOn(Store, 'exportBookingsCSV').mockResolvedValue(true);
        document.getElementById('admin-export-btn').click();
        await Promise.resolve();
        expect(document.getElementById('admin-export-btn').textContent).toContain('Exportiert');

        vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
        document.getElementById('admin-clear-bookings-btn').click();
        expect(Store.getBookings()).toEqual([]);
    });

    it('should connect the scanner and update button state', async () => {
        loginAsAdmin();
        ScannerService.connect.mockResolvedValueOnce(true);

        document.getElementById('admin-connect-scanner-btn').click();
        await Promise.resolve();

        const button = document.getElementById('admin-connect-scanner-btn');
        expect(button.disabled).toBe(true);
        expect(button.classList.contains('btn--success')).toBe(true);
    });
});
