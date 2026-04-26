import { describe, it, expect, beforeEach, vi } from 'vitest';
const { Store } = require('../js/store');

describe('Store Module', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        resetSnackautomatDom();
        Store.init();
    });

    describe('API Configuration', () => {
        it('should report API as not configured initially', () => {
            expect(Store.isApiConfigured()).toBe(false);
        });

        it('should set and read API configuration', () => {
            Store.setApiConfig('http://192.168.1.10:8124', 'test-jwt.abc.123');
            expect(Store.isApiConfigured()).toBe(true);
            expect(Store.getApiConfig()).toEqual({
                url: 'http://192.168.1.10:8124',
                token: 'test-jwt.abc.123'
            });
        });
    });

    describe('Admin PIN', () => {
        it('should not have a default PIN configured', () => {
            expect(Store.isPinConfigured()).toBe(false);
            expect(Store.checkPin('1234')).toBe(false);
        });

        it('should set and validate a configured PIN', () => {
            Store.setPin('5678');
            expect(Store.isPinConfigured()).toBe(true);
            expect(Store.checkPin('5678')).toBe(true);
            expect(Store.checkPin('1234')).toBe(false);
        });

        it('should reject invalid PIN formats', () => {
            expect(() => Store.setPin('12')).toThrow('INVALID_PIN');
            expect(() => Store.setPin('abcd')).toThrow('INVALID_PIN');
        });

        it('should migrate and remove a legacy plaintext PIN', () => {
            localStorage.clear();
            localStorage.setItem('snackautomat_pin', '9876');

            Store.init();

            expect(localStorage.getItem('snackautomat_pin')).toBeNull();
            expect(Store.checkPin('9876')).toBe(true);
        });
    });

    describe('Install Password', () => {
        it('should set and validate install password', () => {
            Store.setInstallPassword('very-secret');
            expect(Store.isInstallPasswordConfigured()).toBe(true);
            expect(Store.checkInstallPassword('very-secret')).toBe(true);
            expect(Store.checkInstallPassword('wrong')).toBe(false);
        });

        it('should reject short install passwords', () => {
            expect(() => Store.setInstallPassword('short')).toThrow('INVALID_INSTALL_PASSWORD');
        });
    });

    describe('User Management', () => {
        it('should login, retrieve, and logout a user', () => {
            expect(Store.getCurrentUser()).toBeNull();
            const user = Store.loginUser('John', 'Doe', '12345');
            expect(user).toEqual({ firstName: 'John', lastName: 'Doe', memberId: '12345' });
            expect(Store.getCurrentUser()).toEqual(user);
            Store.logoutUser();
            expect(Store.getCurrentUser()).toBeNull();
        });
    });

    describe('Snacks and Drinks', () => {
        it('should initialize with default snacks and drinks', () => {
            const snacks = Store.getSnacks();
            const drinks = Store.getDrinks();
            expect(snacks.length).toBe(12);
            expect(drinks.length).toBeGreaterThan(0);
        });

        it('should update drinks and snacks', () => {
            Store.updateSnack(1, { name: 'Test Snack', price: 2.5 });
            Store.addDrink({ name: 'Juice', price: 2.5 });
            const snacks = Store.getSnacks();
            const drinks = Store.getDrinks();
            expect(snacks.find((s) => s.id === 1)?.name).toBe('Test Snack');
            expect(drinks.some((d) => d.name === 'Juice')).toBe(true);
        });

        it('should update and remove drinks by id', () => {
            const drink = Store.addDrink({ name: 'Tea', price: 1.25 });
            Store.updateDrink(drink.id, { name: 'Hot Tea', price: 1.75 });
            expect(Store.getDrinks().find((d) => d.id === drink.id)).toMatchObject({ name: 'Hot Tea', price: 1.75 });

            Store.removeDrink(drink.id);
            expect(Store.getDrinks().some((d) => d.id === drink.id)).toBe(false);
        });

        it('should ignore updates for missing products', () => {
            const snacksBefore = Store.getSnacks();
            const drinksBefore = Store.getDrinks();
            Store.updateSnack(999, { name: 'Ghost' });
            Store.updateDrink(999, { name: 'Ghost' });
            expect(Store.getSnacks()).toEqual(snacksBefore);
            expect(Store.getDrinks()).toEqual(drinksBefore);
        });
    });

    describe('Bookings', () => {
        it('should add and clear bookings', () => {
            Store.loginUser('John', 'Doe');
            Store.addBooking('snack', { name: 'Mars', price: 1.5 });
            expect(Store.getBookings().length).toBe(1);
            Store.clearBookings();
            expect(Store.getBookings()).toEqual([]);
        });

        it('should export bookings via blob fallback', async () => {
            Store.addBooking('snack', { name: 'Mars', price: 1.5 });
            global.URL.createObjectURL = vi.fn(() => 'blob:test');
            global.URL.revokeObjectURL = vi.fn();
            const result = await Store.exportBookingsCSV();
            expect(result).toBe(true);
        });

        it('should return null when there are no bookings to export', async () => {
            expect(await Store.exportBookingsCSV()).toBeNull();
        });

        it('should use the native save picker when available', async () => {
            Store.addBooking('drink', { name: 'Water', price: 1 });
            const writable = {
                write: vi.fn().mockResolvedValue(),
                close: vi.fn().mockResolvedValue()
            };
            window.showSaveFilePicker = vi.fn().mockResolvedValue({
                createWritable: vi.fn().mockResolvedValue(writable)
            });

            expect(await Store.exportBookingsCSV()).toBe(true);
            expect(window.showSaveFilePicker).toHaveBeenCalled();
            expect(writable.write).toHaveBeenCalledWith(expect.stringContaining('Water'));
        });

        it('should surface cancelled native exports', async () => {
            Store.addBooking('drink', { name: 'Water', price: 1 });
            window.showSaveFilePicker = vi.fn().mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'AbortError' }));

            expect(await Store.exportBookingsCSV()).toBe('cancelled');
        });
    });
});
