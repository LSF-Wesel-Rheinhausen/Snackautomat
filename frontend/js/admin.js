/**
 * admin.js – Admin-Interface
 * PIN-Zugang, Produkt-/Preisverwaltung und CSV-Export.
 */

const AdminView = (() => {
    let isAuthenticated = false;
    const PIN_PATTERN = /^\d{4,10}$/;

    function init() {
        document.getElementById('admin-login-btn').addEventListener('click', handleLogin);
        document.getElementById('admin-pin-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        document.getElementById('admin-logout-btn').addEventListener('click', handleLogout);
        document.getElementById('admin-save-btn').addEventListener('click', saveAll);
        document.getElementById('admin-export-btn').addEventListener('click', handleExport);
        document.getElementById('admin-clear-bookings-btn').addEventListener('click', handleClearBookings);
        document.getElementById('admin-add-drink-btn').addEventListener('click', addNewDrink);
        document.getElementById('admin-connect-scanner-btn').addEventListener('click', handleConnectScanner);
    }

    function handleLogin() {
        const pinInput = document.getElementById('admin-pin-input');
        const pin = pinInput.value.trim();
        const errorEl = document.getElementById('admin-login-error');

        if (!Store.isPinConfigured()) {
            errorEl.textContent = 'Keine Admin-PIN konfiguriert. Bitte Ersteinrichtung ausführen.';
            pinInput.value = '';
            return;
        }

        if (Store.checkPin(pin)) {
            isAuthenticated = true;
            document.getElementById('admin-login-section').classList.add('hidden');
            document.getElementById('admin-content-section').classList.remove('hidden');
            errorEl.textContent = '';
            pinInput.value = '';
            renderAdminContent();
        } else {
            errorEl.textContent = 'Falscher PIN. Bitte erneut versuchen.';
            pinInput.value = '';
            pinInput.focus();
        }
    }

    function handleLogout() {
        isAuthenticated = false;
        document.getElementById('admin-login-section').classList.remove('hidden');
        document.getElementById('admin-content-section').classList.add('hidden');
    }

    function renderAdminContent() {
        // API Settings
        const apiConfig = Store.getApiConfig();
        document.getElementById('admin-api-url').value = apiConfig.url;
        document.getElementById('admin-api-jwt').value = apiConfig.token;
        document.getElementById('admin-new-pin').value = '';

        renderSnackTable();
        renderDrinkTable();
        renderBookingHistory();
    }

    function renderSnackTable() {
        const tbody = document.getElementById('admin-snack-tbody');
        const snacks = Store.getSnacks();
        tbody.innerHTML = '';

        snacks.forEach(snack => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="row-label">Reihe ${snack.id}</span></td>
                <td>
                    <input type="text" class="admin-input" 
                           value="${escapeAttr(snack.name)}" 
                           data-snack-id="${snack.id}" 
                           data-field="name"
                           aria-label="Name für Reihe ${snack.id}"
                           id="admin-snack-name-${snack.id}">
                </td>
                <td>
                    <div class="price-input-wrapper">
                        <input type="number" class="admin-input admin-input--price" 
                               value="${snack.price.toFixed(2)}" 
                               step="0.10" min="0"
                               data-snack-id="${snack.id}" 
                               data-field="price"
                               aria-label="Preis für Reihe ${snack.id}"
                               id="admin-snack-price-${snack.id}">
                        <span class="price-unit">€</span>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderDrinkTable() {
        const tbody = document.getElementById('admin-drink-tbody');
        const drinks = Store.getDrinks();
        tbody.innerHTML = '';

        drinks.forEach(drink => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input type="text" class="admin-input" 
                           value="${escapeAttr(drink.name)}" 
                           data-drink-id="${drink.id}" 
                           data-field="name"
                           aria-label="Getränkename"
                           id="admin-drink-name-${drink.id}">
                </td>
                <td>
                    <div class="price-input-wrapper">
                        <input type="number" class="admin-input admin-input--price" 
                               value="${drink.price.toFixed(2)}" 
                               step="0.10" min="0"
                               data-drink-id="${drink.id}" 
                               data-field="price"
                               aria-label="Getränkepreis"
                               id="admin-drink-price-${drink.id}">
                        <span class="price-unit">€</span>
                    </div>
                </td>
                <td>
                    <button class="btn btn--danger btn--small" 
                            data-drink-id="${drink.id}"
                            aria-label="${drink.name} löschen"
                            id="admin-drink-delete-${drink.id}">
                        ✕
                    </button>
                </td>
            `;

            tr.querySelector('.btn--danger').addEventListener('click', () => {
                if (confirm(`"${drink.name}" wirklich löschen?`)) {
                    Store.removeDrink(drink.id);
                    renderDrinkTable();
                    DrinksView.render();
                }
            });

            tbody.appendChild(tr);
        });
    }

    function renderBookingHistory() {
        const container = document.getElementById('admin-booking-history');
        const bookings = Store.getBookings();

        if (bookings.length === 0) {
            container.innerHTML = '<p class="empty-message">Noch keine Buchungen vorhanden.</p>';
            return;
        }

        // Show most recent first
        const sorted = [...bookings].reverse();
        let html = `
            <div class="booking-stats">
                <div class="stat-card">
                    <span class="stat-value">${bookings.length}</span>
                    <span class="stat-label">Buchungen gesamt</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${bookings.filter(b => b.type === 'snack').length}</span>
                    <span class="stat-label">Snacks</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${bookings.filter(b => b.type === 'drink').length}</span>
                    <span class="stat-label">Getränke</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${bookings.reduce((sum, b) => sum + b.price, 0).toFixed(2).replace('.', ',')} €</span>
                    <span class="stat-label">Gesamtumsatz</span>
                </div>
            </div>
            <table class="admin-table" aria-label="Buchungshistorie">
                <thead>
                    <tr>
                        <th>Zeitpunkt</th>
                        <th>Nutzer</th>
                        <th>Typ</th>
                        <th>Produkt</th>
                        <th>Preis</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sorted.slice(0, 50).forEach(b => {
            const date = new Date(b.timestamp);
            const userName = b.userName || 'Unbekannt';
            html += `
                <tr>
                    <td>${date.toLocaleString('de-DE')}</td>
                    <td>${escapeHtml(userName)}</td>
                    <td><span class="badge badge--${b.type}">${b.type === 'snack' ? 'Snack' : 'Getränk'}</span></td>
                    <td>${escapeHtml(b.productName)}</td>
                    <td>${b.price.toFixed(2).replace('.', ',')} €</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        if (sorted.length > 50) {
            html += `<p class="text-muted">Zeige die letzten 50 von ${sorted.length} Buchungen.</p>`;
        }

        container.innerHTML = html;
    }

    function addNewDrink() {
        const nameInput = document.getElementById('admin-new-drink-name');
        const priceInput = document.getElementById('admin-new-drink-price');
        const name = nameInput.value.trim();
        const price = parseFloat(priceInput.value);

        if (!name) {
            nameInput.focus();
            return;
        }
        if (isNaN(price) || price < 0) {
            priceInput.focus();
            return;
        }

        Store.addDrink({ name, price });
        nameInput.value = '';
        priceInput.value = '';
        renderDrinkTable();
        DrinksView.render();
        nameInput.focus();
    }

    function saveAll() {
        // Validation logic
        const apiUrl = document.getElementById('admin-api-url').value.trim();
        const apiJwt = document.getElementById('admin-api-jwt').value.trim();
        const newPin = document.getElementById('admin-new-pin').value.trim();

        if (!apiUrl) {
            alert('Fehler: Die API URL darf nicht leer sein.');
            return;
        }

        try {
            new URL(apiUrl);
        } catch (_) {
            alert('Fehler: Die eingegebene API URL ist ungültig.');
            return;
        }

        if (!apiJwt) {
            alert('Fehler: JWT-Token darf nicht leer sein.');
            return;
        }

        const jwtParts = apiJwt.split('.');
        if (jwtParts.length !== 3) {
            alert('Fehler: Das eingegebene JWT-Token hat kein gültiges Format.');
            return;
        }

        if (newPin && !PIN_PATTERN.test(newPin)) {
            alert('Fehler: Die neue Admin-PIN muss aus 4 bis 10 Ziffern bestehen.');
            return;
        }

        // Save API Config
        Store.setApiConfig(apiUrl, apiJwt);
        if (newPin) {
            Store.setPin(newPin);
        }

        // Save snacks
        const snacks = Store.getSnacks();
        document.querySelectorAll('#admin-snack-tbody input').forEach(input => {
            const id = parseInt(input.dataset.snackId);
            const field = input.dataset.field;
            const snack = snacks.find(s => s.id === id);
            if (snack) {
                if (field === 'name') snack.name = input.value.trim();
                if (field === 'price') snack.price = parseFloat(input.value) || 0;
            }
        });
        Store.setSnacks(snacks);

        // Save drinks
        const drinks = Store.getDrinks();
        document.querySelectorAll('#admin-drink-tbody input').forEach(input => {
            const id = parseInt(input.dataset.drinkId);
            const field = input.dataset.field;
            const drink = drinks.find(d => d.id === id);
            if (drink) {
                if (field === 'name') drink.name = input.value.trim();
                if (field === 'price') drink.price = parseFloat(input.value) || 0;
            }
        });
        Store.setDrinks(drinks);

        // Re-render views
        SnacksView.render();
        DrinksView.render();

        // Feedback
        const btn = document.getElementById('admin-save-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Gespeichert!';
        btn.classList.add('btn--success');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('btn--success');
        }, 2000);
    }

    async function handleExport() {
        const result = await Store.exportBookingsCSV();
        if (!result) {
            alert('Keine Buchungen zum Exportieren vorhanden.');
        } else if (result === true) {
            // Show success feedback
            var btn = document.getElementById('admin-export-btn');
            var orig = btn.textContent;
            btn.textContent = '✓ Exportiert!';
            btn.classList.add('btn--success');
            setTimeout(function() {
                btn.textContent = orig;
                btn.classList.remove('btn--success');
            }, 2000);
        }
    }

    function handleClearBookings() {
        const bookings = Store.getBookings();
        if (bookings.length === 0) {
            alert('Keine Buchungen vorhanden.');
            return;
        }
        if (confirm(`Alle ${bookings.length} Buchungen wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
            Store.clearBookings();
            renderBookingHistory();
        }
    }

    async function handleConnectScanner() {
        const btn = document.getElementById('admin-connect-scanner-btn');
        const success = await ScannerService.connect();
        if (success) {
            btn.textContent = '✅ Scanner verbunden';
            btn.classList.add('btn--success');
            btn.disabled = true;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function show() {
        if (isAuthenticated) {
            renderAdminContent();
        }
    }

    return { init, show };
})();

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminView };
}
