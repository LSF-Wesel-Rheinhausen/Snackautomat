import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { Store } = require('../js/store');
globalThis.Store = Store;
global.Store = Store;
window.Store = Store;

globalThis.SnacksView = { init: vi.fn(), render: vi.fn() };
globalThis.DrinksView = { init: vi.fn(), render: vi.fn() };
globalThis.AdminView = { init: vi.fn(), show: vi.fn() };
globalThis.ScannerService = { setOnScanCallback: vi.fn() };
globalThis.ApiService = { getUserInfo: vi.fn() };
Object.assign(global, {
    SnacksView: globalThis.SnacksView,
    DrinksView: globalThis.DrinksView,
    AdminView: globalThis.AdminView,
    ScannerService: globalThis.ScannerService,
    ApiService: globalThis.ApiService
});
Object.assign(window, {
    SnacksView: globalThis.SnacksView,
    DrinksView: globalThis.DrinksView,
    AdminView: globalThis.AdminView,
    ScannerService: globalThis.ScannerService,
    ApiService: globalThis.ApiService
});

const { App } = require('../js/app');

describe('App', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        resetSnackautomatDom();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should show setup on first run without API config or install password', () => {
        const focusSpy = vi.spyOn(document.getElementById('setup-api-url'), 'focus').mockImplementation(() => {});

        App.init();

        expect(document.getElementById('setup-screen').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('user-login-screen').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('setup-install-password-group').classList.contains('hidden')).toBe(false);
        expect(focusSpy).toHaveBeenCalled();
    });

    it('should require install authentication when an install password exists', () => {
        Store.setInstallPassword('install-secret');

        App.init();

        expect(document.getElementById('install-auth-screen').classList.contains('hidden')).toBe(false);
        document.getElementById('install-auth-password').value = 'wrong';
        document.getElementById('install-auth-btn').click();
        expect(document.getElementById('install-auth-error').textContent).toContain('Falsches');

        document.getElementById('install-auth-password').value = 'install-secret';
        document.getElementById('install-auth-btn').click();
        expect(document.getElementById('setup-screen').classList.contains('hidden')).toBe(false);
    });

    it('should validate setup fields and save a valid setup', () => {
        App.init();
        const errorEl = document.getElementById('setup-error');

        document.getElementById('setup-start-btn').click();
        expect(errorEl.textContent).toContain('API URL');

        document.getElementById('setup-api-url').value = 'not-a-url';
        document.getElementById('setup-start-btn').click();
        expect(errorEl.textContent).toContain('ungültig');

        document.getElementById('setup-api-url').value = 'http://localhost:8124';
        document.getElementById('setup-start-btn').click();
        expect(errorEl.textContent).toContain('JWT-Token');

        document.getElementById('setup-api-jwt').value = 'invalid';
        document.getElementById('setup-start-btn').click();
        expect(errorEl.textContent).toContain('kein gültiges Format');

        document.getElementById('setup-api-jwt').value = 'a.b.c';
        document.getElementById('setup-admin-pin').value = '12';
        document.getElementById('setup-start-btn').click();
        expect(errorEl.textContent).toContain('Admin-PIN');

        document.getElementById('setup-admin-pin').value = '1234';
        document.getElementById('setup-install-password').value = 'short';
        document.getElementById('setup-start-btn').click();
        expect(errorEl.textContent).toContain('Installationspasswort');

        document.getElementById('setup-install-password').value = 'install-secret';
        document.getElementById('setup-start-btn').click();
        expect(Store.isApiConfigured()).toBe(true);
        expect(Store.checkPin('1234')).toBe(true);
        expect(Store.checkInstallPassword('install-secret')).toBe(true);
        expect(document.getElementById('user-login-screen').classList.contains('hidden')).toBe(false);
        expect(SnacksView.init).toHaveBeenCalled();
    });

    it('should show login when API config exists and no user session is active', () => {
        Store.setApiConfig('http://localhost:8124', 'a.b.c');

        App.init();

        expect(document.getElementById('user-login-screen').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('main-app').classList.contains('hidden')).toBe(true);
        vi.advanceTimersByTime(50);
        expect(document.activeElement).toBe(document.getElementById('user-firstname'));
    });

    it('should login and logout manual users', () => {
        Store.setApiConfig('http://localhost:8124', 'a.b.c');
        App.init();

        document.getElementById('user-login-btn').click();
        expect(document.getElementById('user-login-error').textContent).toContain('Vornamen');

        document.getElementById('user-firstname').value = 'Max';
        document.getElementById('user-login-btn').click();
        expect(document.getElementById('user-login-error').textContent).toContain('Nachnamen');

        document.getElementById('user-lastname').value = 'Muster';
        document.getElementById('user-login-btn').click();
        expect(document.getElementById('main-app').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('user-display-name').textContent).toBe('Max Muster');

        document.getElementById('user-logout-btn').click();
        expect(Store.getCurrentUser()).toBeNull();
        expect(document.getElementById('user-login-screen').classList.contains('hidden')).toBe(false);
    });

    it('should restore an existing user session and switch tabs', () => {
        Store.setApiConfig('http://localhost:8124', 'a.b.c');
        Store.loginUser('Max', 'Muster', 'manual');

        App.init();
        document.getElementById('tab-admin').click();

        expect(document.getElementById('user-display-name').textContent).toBe('Max Muster');
        expect(document.getElementById('view-admin').classList.contains('hidden')).toBe(false);
        expect(AdminView.show).toHaveBeenCalled();
    });

    it('should login chip users through the scanner callback', async () => {
        Store.setApiConfig('http://localhost:8124', 'a.b.c');
        ApiService.getUserInfo.mockResolvedValueOnce({ firstname: 'Chip', lastname: 'User', member_id: '42' });

        App.init();
        const callback = ScannerService.setOnScanCallback.mock.calls[0][0];
        await callback('TAG-1');

        expect(Store.getCurrentUser()).toEqual({ firstName: 'Chip', lastName: 'User', memberId: '42' });
        expect(document.getElementById('main-app').classList.contains('hidden')).toBe(false);
    });

    it('should show scanner login errors for unknown chips and network failures', async () => {
        Store.setApiConfig('http://localhost:8124', 'a.b.c');
        ApiService.getUserInfo.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));

        App.init();
        const callback = ScannerService.setOnScanCallback.mock.calls[0][0];
        await callback('UNKNOWN');
        expect(document.getElementById('user-login-error').textContent).toContain('Unbekannter Chip');

        await callback('BROKEN');
        expect(document.getElementById('user-login-error').textContent).toContain('Netzwerkfehler');
    });
});
