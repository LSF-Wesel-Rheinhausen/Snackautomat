/**
 * app.js – Anwendungs-Initialisierung, Navigation & Nutzer-Login
 */

const App = (() => {
    const TABS = ['snacks', 'drinks', 'admin'];
    const PIN_PATTERN = /^\d{4,10}$/;

    function init() {
        Store.init();

        // Tab-Navigation
        document.querySelectorAll('.nav__tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab.dataset.tab);
            });
        });

        // Keyboard navigation (Enter/Space) for tabs
        document.querySelectorAll('.nav__tab').forEach(tab => {
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    switchTab(tab.dataset.tab);
                }
            });
        });

        // User login form
        document.getElementById('user-login-btn').addEventListener('click', handleUserLogin);
        document.getElementById('user-lastname').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleUserLogin();
        });

        // User logout
        document.getElementById('user-logout-btn').addEventListener('click', handleUserLogout);

        // Initialize views
        SnacksView.init();
        DrinksView.init();
        AdminView.init();

        // Setup Scanner Callback
        ScannerService.setOnScanCallback(handleScannerLogin);
        
        // Handle First-Run Setup Authentication
        document.getElementById('install-auth-btn').addEventListener('click', handleInstallAuth);
        document.getElementById('install-auth-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleInstallAuth();
        });

        // Handle First-Run Setup
        document.getElementById('setup-start-btn').addEventListener('click', handleSetupComplete);

        // Check if API config exists (First run logic)
        if (!Store.isApiConfigured()) {
            if (Store.isInstallPasswordConfigured()) {
                showInstallAuthScreen();
            } else {
                showSetupScreen();
            }
            return; // Halt regular execution
        }

        // Check if user is already logged in (sessionStorage persists within tab)
        const user = Store.getCurrentUser();
        if (user) {
            showMainApp(user);
        } else {
            showLoginScreen();
        }
    }

    function handleUserLogin() {
        const firstNameInput = document.getElementById('user-firstname');
        const lastNameInput = document.getElementById('user-lastname');
        const errorEl = document.getElementById('user-login-error');

        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();

        if (!firstName) {
            errorEl.textContent = 'Bitte Vornamen eingeben.';
            firstNameInput.focus();
            return;
        }
        if (!lastName) {
            errorEl.textContent = 'Bitte Nachnamen eingeben.';
            lastNameInput.focus();
            return;
        }

        errorEl.textContent = '';
        const user = Store.loginUser(firstName, lastName, 'manual');
        showMainApp(user);
    }

    async function handleScannerLogin(rfidTag) {
        const errorEl = document.getElementById('user-login-error');
        // Falls wir nicht im Login Screen sind, nichts tun oder abmelden und neu anmelden
        if (document.getElementById('user-login-screen').classList.contains('hidden')) {
            console.log('Scanner getriggert, aber User ist bereits eingeloggt.');
            // Optional: Automatischer Logout, wenn ein anderer Chip gescannt wird?
            return;
        }
        
        try {
            errorEl.textContent = 'Verifiziere Chip...';
            const userInfo = await ApiService.getUserInfo(rfidTag);
            
            if (userInfo && userInfo.member_id) {
                // Success
                errorEl.textContent = '';
                const user = Store.loginUser(userInfo.firstname, userInfo.lastname, userInfo.member_id);
                showMainApp(user);
            } else {
                errorEl.textContent = 'Unbekannter Chip oder User nicht gefunden.';
            }
        } catch (e) {
            errorEl.textContent = 'Netzwerkfehler beim Prüfen des Chips.';
        }
    }

    function handleUserLogout() {
        Store.logoutUser();
        showLoginScreen();
    }

    function showLoginScreen() {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('user-login-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('user-firstname').value = '';
        document.getElementById('user-lastname').value = '';
        document.getElementById('user-login-error').textContent = '';
        
        // Kleine Verzögerung um sicherzustellen, dass das UI gerendert ist
        setTimeout(() => document.getElementById('user-firstname').focus(), 50);
    }

    function showInstallAuthScreen() {
        document.getElementById('install-auth-screen').classList.remove('hidden');
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('user-login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('install-auth-password').value = '';
        document.getElementById('install-auth-error').textContent = '';
        document.getElementById('install-auth-password').focus();
    }

    function handleInstallAuth() {
        const passwordInput = document.getElementById('install-auth-password').value.trim();
        const errorEl = document.getElementById('install-auth-error');

        if (Store.checkInstallPassword(passwordInput)) {
            errorEl.textContent = '';
            showSetupScreen();
        } else {
            errorEl.textContent = 'Falsches Installationspasswort.';
        }
    }

    function showSetupScreen() {
        document.getElementById('install-auth-screen').classList.add('hidden');
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('user-login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.add('hidden');

        const installPasswordGroup = document.getElementById('setup-install-password-group');
        const installPasswordInput = document.getElementById('setup-install-password');
        const installPasswordRequired = !Store.isInstallPasswordConfigured();

        installPasswordGroup.classList.toggle('hidden', !installPasswordRequired);
        installPasswordInput.value = '';
        document.getElementById('setup-error').textContent = '';
        document.getElementById('setup-api-url').focus();
    }

    function handleSetupComplete() {
        const urlInput = document.getElementById('setup-api-url').value.trim();
        const jwtInput = document.getElementById('setup-api-jwt').value.trim();
        const pinInput = document.getElementById('setup-admin-pin').value.trim();
        const installPasswordInput = document.getElementById('setup-install-password').value.trim();
        const errorEl = document.getElementById('setup-error');
        const installPasswordRequired = !Store.isInstallPasswordConfigured();

        if (!urlInput) {
            errorEl.textContent = 'Bitte eine API URL eintragen.';
            return;
        }

        // Validate URL format
        try {
            new URL(urlInput);
        } catch (_) {
            errorEl.textContent = 'Die eingegebene API URL ist ungültig (z.B. http://localhost:8124).';
            return;
        }

        if (!jwtInput) {
            errorEl.textContent = 'Bitte einen JWT-Token eintragen.';
            return;
        }

        const jwtParts = jwtInput.split('.');
        if (jwtParts.length !== 3) {
            errorEl.textContent = 'Das eingegebene JWT-Token hat kein gültiges Format.';
            return;
        }

        if (!PIN_PATTERN.test(pinInput)) {
            errorEl.textContent = 'Bitte eine Admin-PIN mit 4 bis 10 Ziffern vergeben.';
            return;
        }

        if (installPasswordRequired && installPasswordInput.length < 8) {
            errorEl.textContent = 'Bitte ein Installationspasswort mit mindestens 8 Zeichen vergeben.';
            return;
        }

        if (installPasswordInput && installPasswordInput.length < 8) {
            errorEl.textContent = 'Installationspasswort muss mindestens 8 Zeichen lang sein.';
            return;
        }

        errorEl.textContent = '';

        try {
            Store.setApiConfig(urlInput, jwtInput);
            Store.setPin(pinInput);

            if (installPasswordRequired || installPasswordInput) {
                Store.setInstallPassword(installPasswordInput);
            }
        } catch (e) {
            errorEl.textContent = 'Einstellungen konnten nicht gespeichert werden.';
            return;
        }

        // Proceed to normal flow
        showLoginScreen();
        // Since we now have the config, we should reload snacks
        SnacksView.init();
    }

    function showMainApp(user) {
        document.getElementById('user-login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        // Update user display in header
        const displayEl = document.getElementById('user-display-name');
        displayEl.textContent = `${user.firstName} ${user.lastName}`;

        // Default tab
        switchTab('snacks');
    }

    function switchTab(tabName) {
        if (!TABS.includes(tabName)) return;

        // Update tab buttons
        document.querySelectorAll('.nav__tab').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('nav__tab--active', isActive);
            tab.setAttribute('aria-selected', isActive);
        });

        // Update tab panels
        TABS.forEach(t => {
            const panel = document.getElementById(`view-${t}`);
            const isActive = t === tabName;
            panel.classList.toggle('hidden', !isActive);
            panel.setAttribute('aria-hidden', !isActive);
        });

        // Refresh admin content when switching to admin
        if (tabName === 'admin') {
            AdminView.show();
        }
    }

    return { init };
})();

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App };
}
