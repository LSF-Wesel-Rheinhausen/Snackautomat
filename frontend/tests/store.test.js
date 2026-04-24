import { describe, it, expect, beforeEach, vi } from 'vitest';
const { Store } = require('../js/store');

describe('Store Module', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
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
    });

    describe('Install Password', () => {
        it('should set and validate install password', () => {
            Store.setInstallPassword('very-secret');
            expect(Store.isInstallPasswordConfigured()).toBe(true);
            expect(Store.checkInstallPassword('very-secret')).toBe(true);
            expect(Store.checkInstallPassword('wrong')).toBe(false);
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
    });
});
