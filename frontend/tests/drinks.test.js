import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { Store } = require('../js/store');
globalThis.Store = Store;
global.Store = Store;
window.Store = Store;
const { DrinksView } = require('../js/drinks');

describe('DrinksView', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        sessionStorage.clear();
        resetSnackautomatDom();
        Store.init();
        DrinksView.init();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should render an empty state when no drinks are configured', () => {
        Store.setDrinks([]);
        DrinksView.render();

        expect(document.getElementById('drinks-grid').textContent).toContain('Keine Getränke konfiguriert');
    });

    it('should render configured drinks with escaped names and prices', () => {
        Store.setDrinks([{ id: 1, name: '<Cola>', price: 2 }]);
        DrinksView.render();

        const grid = document.getElementById('drinks-grid');
        expect(grid.querySelectorAll('.product-card')).toHaveLength(1);
        expect(grid.innerHTML).toContain('&lt;Cola&gt;');
        expect(grid.textContent).toContain('2,00');
    });

    it('should add a local booking and reset button state after booking', () => {
        Store.loginUser('Max', 'Muster', 'manual');
        Store.setDrinks([{ id: 1, name: 'Wasser', price: 1 }]);
        DrinksView.render();

        const button = document.getElementById('drink-btn-1');
        button.click();

        expect(Store.getBookings()).toHaveLength(1);
        expect(Store.getBookings()[0]).toMatchObject({ type: 'drink', productName: 'Wasser', userName: 'Max Muster' });
        expect(button.disabled).toBe(true);
        expect(button.textContent).toContain('Gebucht');

        vi.advanceTimersByTime(1500);
        expect(button.disabled).toBe(false);
        expect(button.textContent).toBe('Buchen');
    });
});
