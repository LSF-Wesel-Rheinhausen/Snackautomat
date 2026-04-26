import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
const { Store } = require('../js/store');
globalThis.Store = Store;
global.Store = Store;
window.Store = Store;
const { ApiService } = require('../js/api');

describe('ApiService Module', () => {
    global.fetch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        resetSnackautomatDom();
        Store.init();
        Store.setApiConfig('http://localhost:8124', 'test-valid-jwt.token.value');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getFilteredSnacks', () => {
        it('should map broker response to a fixed 12-row array', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    'item-1': { designation: '[1] Schoko', price_member: 1.5, available: 10 },
                    'item-3': { designation: '[12] Chips', prices: [{ price: '2.0' }], available: 5 },
                    'item-x': { designation: 'Invalid entry' }
                })
            });

            const snacks = await ApiService.getFilteredSnacks();
            expect(snacks.length).toBe(12);
            expect(snacks[0]).toMatchObject({ id: 1, name: 'Schoko', price: 1.5, rawId: 'item-1' });
            expect(snacks[1]).toMatchObject({ id: 2, name: 'Leer', price: 0 });
            expect(snacks[11]).toMatchObject({ id: 12, name: 'Chips', price: 2, rawId: 'item-3' });
        });

        it('should return empty array when request fails', async () => {
            fetch.mockRejectedValueOnce(new Error('Network Error'));
            const snacks = await ApiService.getFilteredSnacks();
            expect(snacks).toEqual([]);
        });

        it('should trim trailing API URL slashes and send authorization headers', async () => {
            Store.setApiConfig('http://localhost:8124///', 'jwt-token');
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });

            await ApiService.getFilteredSnacks();

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8124/getValidFUProducts',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer jwt-token',
                        'Content-Type': 'application/json'
                    })
                })
            );
        });

        it('should ignore invalid row ids and fallback invalid prices to zero', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    'bad-low': { designation: '[0] Too low', price_member: 9 },
                    'bad-high': { designation: '[13] Too high', price_member: 9 },
                    'bad-price': { designation: '[2] Broken price', prices: [{ price: 'abc' }] }
                })
            });

            const snacks = await ApiService.getFilteredSnacks();
            expect(snacks[0]).toMatchObject({ id: 1, name: 'Leer', price: 0 });
            expect(snacks[1]).toMatchObject({ id: 2, name: 'Broken price', price: 0 });
            expect(snacks[11]).toMatchObject({ id: 12, name: 'Leer', price: 0 });
        });

        it('should throw API_NOT_CONFIGURED when called without config through booking path', async () => {
            localStorage.clear();
            await expect(ApiService.buyProduct('1', '2')).rejects.toThrow('API_NOT_CONFIGURED');
        });
    });

    describe('getUserInfo', () => {
        it('should return user info on success', async () => {
            const mockResponse = { member_id: '12345', firstname: 'Max', lastname: 'Mustermann' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await ApiService.getUserInfo('tag-xyz');
            expect(result).toEqual(mockResponse);
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8124/getUserInfo',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ rfid_id: 'tag-xyz' })
                })
            );
        });

        it('should return null on backend errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ error: 'User not found' })
            });

            const result = await ApiService.getUserInfo('bad-tag');
            expect(result).toBeNull();
        });
    });

    describe('buyProduct', () => {
        it('should post booking payload', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const result = await ApiService.buyProduct('member-123', 'item-456', 1);
            expect(result).toEqual({ success: true });
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8124/Buy',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ memberid: 'member-123', itemid: 'item-456', amount: 1 })
                })
            );
        });

        it('should throw on booking failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 402,
                json: async () => ({ error: 'Insufficient funds' })
            });
            await expect(ApiService.buyProduct('member-123', 'item-456', 1)).rejects.toThrow('Insufficient funds');
        });
    });
});
