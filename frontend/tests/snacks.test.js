import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { Store } = require('../js/store');
globalThis.Store = Store;
global.Store = Store;
window.Store = Store;

globalThis.ApiService = {
    getFilteredSnacks: vi.fn(),
    buyProduct: vi.fn()
};
global.ApiService = globalThis.ApiService;
window.ApiService = globalThis.ApiService;

const { SnacksView } = require('../js/snacks');

describe('SnacksView', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        resetSnackautomatDom();
        Store.init();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should load snacks from the API and cache them in the store', async () => {
        const apiSnacks = [{ id: 1, name: 'Schoko', price: 1.5, rawId: 'api-1' }];
        ApiService.getFilteredSnacks.mockResolvedValueOnce(apiSnacks);

        await SnacksView.init();

        expect(Store.getSnacks()).toEqual(apiSnacks);
        expect(document.getElementById('snacks-grid').textContent).toContain('Schoko');
    });

    it('should fallback to local snacks when the API returns no products', async () => {
        ApiService.getFilteredSnacks.mockResolvedValueOnce([]);
        Store.setSnacks([{ id: 1, name: 'Fallback', price: 1.25 }]);

        await SnacksView.init();

        expect(document.getElementById('snacks-grid').textContent).toContain('Fallback');
    });

    it('should render placeholders as disabled rows', () => {
        SnacksView.render([{ id: 1, name: 'Leer', price: 0 }]);

        const button = document.getElementById('snack-btn-1');
        expect(button.disabled).toBe(true);
        expect(button.textContent).toContain('Nicht belegt');
    });

    it('should book API-backed snacks for chip users and record them locally', async () => {
        Store.loginUser('Max', 'Muster', 'member-1');
        ApiService.buyProduct.mockResolvedValueOnce({ ok: true });
        SnacksView.render([{ id: 1, name: 'Schoko', price: 1.5, rawId: 'api-1' }]);

        const button = document.getElementById('snack-btn-1');
        button.click();
        await Promise.resolve();

        expect(ApiService.buyProduct).toHaveBeenCalledWith('member-1', 'api-1', 1);
        expect(Store.getBookings()[0]).toMatchObject({ type: 'snack', productName: 'Schoko', userName: 'Max Muster' });
        expect(button.textContent).toContain('Gebucht');

        vi.advanceTimersByTime(2000);
        expect(button.disabled).toBe(false);
        expect(button.textContent.trim()).toBe('Buchen');
    });

    it('should simulate local bookings for manual users without calling the API', async () => {
        Store.loginUser('Manual', 'User', 'manual');
        SnacksView.render([{ id: 1, name: 'Schoko', price: 1.5, rawId: 'api-1' }]);

        document.getElementById('snack-btn-1').click();
        await Promise.resolve();

        expect(ApiService.buyProduct).not.toHaveBeenCalled();
        expect(Store.getBookings()).toHaveLength(1);
    });

    it('should ask users to log in before booking', async () => {
        const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
        SnacksView.render([{ id: 1, name: 'Schoko', price: 1.5, rawId: 'api-1' }]);

        document.getElementById('snack-btn-1').click();
        await Promise.resolve();

        expect(alertSpy).toHaveBeenCalledWith('Bitte melde dich zuerst an!');
        expect(Store.getBookings()).toEqual([]);
    });

    it('should show an error state when API booking fails', async () => {
        const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
        Store.loginUser('Max', 'Muster', 'member-1');
        ApiService.buyProduct.mockRejectedValueOnce(new Error('Boom'));
        SnacksView.render([{ id: 1, name: 'Schoko', price: 1.5, rawId: 'api-1' }]);

        const button = document.getElementById('snack-btn-1');
        button.click();
        await Promise.resolve();

        expect(alertSpy).toHaveBeenCalledWith('Buchung fehlgeschlagen: Boom');
        expect(button.textContent).toContain('Fehler');
        expect(Store.getBookings()).toEqual([]);
    });
});
