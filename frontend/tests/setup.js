import { vi } from 'vitest';

const createStorageMock = () => {
    let store = {};
    return {
        getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
        setItem: vi.fn((key, value) => {
            store[key] = String(value);
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, configurable: true });

if (globalThis.window) {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, configurable: true });
}

if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
}

Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () => 'test-uuid-1234',
    configurable: true
});

globalThis.resetSnackautomatDom = () => {
    document.body.innerHTML = `
    <div id="install-auth-screen" class="hidden">
        <input id="install-auth-password" />
        <button id="install-auth-btn"></button>
        <p id="install-auth-error"></p>
    </div>

    <div id="setup-screen" class="hidden">
        <input id="setup-api-url" />
        <input id="setup-api-jwt" />
        <input id="setup-admin-pin" />
        <div id="setup-install-password-group" class="hidden"></div>
        <input id="setup-install-password" />
        <button id="setup-start-btn"></button>
        <p id="setup-error"></p>
    </div>

    <div id="user-login-screen">
        <input id="user-firstname" />
        <input id="user-lastname" />
        <button id="user-login-btn"></button>
        <p id="user-login-error"></p>
    </div>

    <div id="main-app" class="hidden">
        <span id="user-display-name"></span>
        <button id="user-logout-btn"></button>

        <button id="tab-snacks" class="nav__tab" data-tab="snacks"></button>
        <button id="tab-drinks" class="nav__tab" data-tab="drinks"></button>
        <button id="tab-admin" class="nav__tab" data-tab="admin"></button>

        <section id="view-snacks">
            <div id="snacks-grid"></div>
        </section>
        <section id="view-drinks" class="hidden">
            <div id="drinks-grid"></div>
        </section>
        <section id="view-admin" class="hidden">
            <div id="admin-login-section">
                <input id="admin-pin-input" />
                <button id="admin-login-btn"></button>
                <p id="admin-login-error"></p>
            </div>
            <div id="admin-content-section" class="hidden">
                <input id="admin-api-url" />
                <input id="admin-api-jwt" />
                <input id="admin-new-pin" />
                <button id="admin-connect-scanner-btn"></button>
                <button id="admin-save-btn"></button>
                <button id="admin-export-btn"></button>
                <button id="admin-clear-bookings-btn"></button>
                <button id="admin-logout-btn"></button>
                <table><tbody id="admin-snack-tbody"></tbody></table>
                <table><tbody id="admin-drink-tbody"></tbody></table>
                <input id="admin-new-drink-name" />
                <input id="admin-new-drink-price" />
                <button id="admin-add-drink-btn"></button>
                <div id="admin-booking-history"></div>
            </div>
        </section>
    </div>
`;
};

resetSnackautomatDom();
