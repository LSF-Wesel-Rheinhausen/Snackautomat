/**
 * store.js – Datenverwaltung für den Snackautomaten
 * Speichert Produkte, Getränke und Buchungen in LocalStorage.
 */

const Store = (() => {
    const KEYS = {
        snacks: 'snackautomat_snacks',
        drinks: 'snackautomat_drinks',
        bookings: 'snackautomat_bookings',
        adminPinHash: 'snackautomat_pin_hash',
        legacyAdminPin: 'snackautomat_pin',
        installPasswordHash: 'snackautomat_install_password_hash',
        currentUser: 'snackautomat_currentUser',
        apiUrl: 'snackautomat_apiUrl',
        jwtToken: 'snackautomat_jwtToken'
    };

    const DEFAULT_SNACKS = [
        { id: 1, name: 'Schokoriegel', price: 1.20 },
        { id: 2, name: 'Chips', price: 1.50 },
        { id: 3, name: 'Gummibärchen', price: 1.00 },
        { id: 4, name: 'Müsliriegel', price: 1.30 },
        { id: 5, name: 'Kekse', price: 1.10 },
        { id: 6, name: 'Nüsse', price: 1.80 },
        { id: 7, name: 'Waffeln', price: 1.40 },
        { id: 8, name: 'Popcorn', price: 1.60 },
        { id: 9, name: 'Salzstangen', price: 0.90 },
        { id: 10, name: 'Fruchtriegel', price: 1.20 },
        { id: 11, name: 'Studentenfutter', price: 2.00 },
        { id: 12, name: 'Cracker', price: 1.10 }
    ];

    const DEFAULT_DRINKS = [
        { id: 1, name: 'Cola', price: 2.00 },
        { id: 2, name: 'Wasser', price: 1.00 },
        { id: 3, name: 'Apfelschorle', price: 1.80 },
        { id: 4, name: 'Eistee', price: 1.50 },
        { id: 5, name: 'Orangensaft', price: 2.00 },
        { id: 6, name: 'Kaffee', price: 1.50 }
    ];

    const PIN_PATTERN = /^\d{4,10}$/;

    function _get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Store read error:', e);
            return null;
        }
    }

    function _set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Store write error:', e);
        }
    }

    function _normalizeSecret(value) {
        return String(value || '').trim();
    }

    // Lightweight non-cryptographic hash to avoid storing plaintext secrets in localStorage.
    function _hashSecret(secret) {
        const normalized = _normalizeSecret(secret);
        let h1 = 0xdeadbeef ^ normalized.length;
        let h2 = 0x41c6ce57 ^ normalized.length;

        for (let i = 0; i < normalized.length; i++) {
            const ch = normalized.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }

        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

        return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
    }

    function _safeEqual(a, b) {
        const left = String(a || '');
        const right = String(b || '');
        const max = Math.max(left.length, right.length);
        let diff = left.length ^ right.length;

        for (let i = 0; i < max; i++) {
            const l = i < left.length ? left.charCodeAt(i) : 0;
            const r = i < right.length ? right.charCodeAt(i) : 0;
            diff |= l ^ r;
        }

        return diff === 0;
    }

    function _isValidPin(pin) {
        return PIN_PATTERN.test(_normalizeSecret(pin));
    }

    function init() {
        if (!_get(KEYS.snacks)) {
            _set(KEYS.snacks, DEFAULT_SNACKS);
        }
        if (!_get(KEYS.drinks)) {
            _set(KEYS.drinks, DEFAULT_DRINKS);
        }
        if (!_get(KEYS.bookings)) {
            _set(KEYS.bookings, []);
        }

        // Migrate plaintext PIN from older versions to hashed storage.
        const legacyPin = localStorage.getItem(KEYS.legacyAdminPin);
        if (legacyPin && !localStorage.getItem(KEYS.adminPinHash)) {
            localStorage.setItem(KEYS.adminPinHash, _hashSecret(legacyPin));
            localStorage.removeItem(KEYS.legacyAdminPin);
        } else if (legacyPin) {
            localStorage.removeItem(KEYS.legacyAdminPin);
        }
    }

    // --- Snacks ---
    function getSnacks() {
        return _get(KEYS.snacks) || DEFAULT_SNACKS;
    }

    function setSnacks(snacks) {
        _set(KEYS.snacks, snacks);
    }

    function updateSnack(id, updates) {
        const snacks = getSnacks();
        const idx = snacks.findIndex(s => s.id === id);
        if (idx !== -1) {
            snacks[idx] = { ...snacks[idx], ...updates };
            setSnacks(snacks);
        }
    }

    // --- Drinks ---
    function getDrinks() {
        return _get(KEYS.drinks) || DEFAULT_DRINKS;
    }

    function setDrinks(drinks) {
        _set(KEYS.drinks, drinks);
    }

    function addDrink(drink) {
        const drinks = getDrinks();
        const maxId = drinks.length > 0 ? Math.max(...drinks.map(d => d.id)) : 0;
        drink.id = maxId + 1;
        drinks.push(drink);
        setDrinks(drinks);
        return drink;
    }

    function updateDrink(id, updates) {
        const drinks = getDrinks();
        const idx = drinks.findIndex(d => d.id === id);
        if (idx !== -1) {
            drinks[idx] = { ...drinks[idx], ...updates };
            setDrinks(drinks);
        }
    }

    function removeDrink(id) {
        const drinks = getDrinks().filter(d => d.id !== id);
        setDrinks(drinks);
    }

    // --- Bookings ---
    function getBookings() {
        return _get(KEYS.bookings) || [];
    }

    function addBooking(type, product) {
        const bookings = getBookings();
        const user = getCurrentUser();
        const booking = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
            type: type,
            productName: product.name,
            price: product.price,
            userName: user ? (user.firstName + ' ' + user.lastName) : 'Unbekannt',
            timestamp: new Date().toISOString()
        };
        bookings.push(booking);
        _set(KEYS.bookings, bookings);
        return booking;
    }

    function clearBookings() {
        _set(KEYS.bookings, []);
    }

    // --- Admin PIN ---
    function isPinConfigured() {
        return !!localStorage.getItem(KEYS.adminPinHash);
    }

    function checkPin(pin) {
        if (!_isValidPin(pin)) return false;

        const storedHash = localStorage.getItem(KEYS.adminPinHash);
        if (!storedHash) return false;
        return _safeEqual(storedHash, _hashSecret(pin));
    }

    function setPin(newPin) {
        if (!_isValidPin(newPin)) {
            throw new Error('INVALID_PIN');
        }
        localStorage.setItem(KEYS.adminPinHash, _hashSecret(newPin));
        localStorage.removeItem(KEYS.legacyAdminPin);
    }

    // --- Install Password ---
    function isInstallPasswordConfigured() {
        return !!localStorage.getItem(KEYS.installPasswordHash);
    }

    function checkInstallPassword(password) {
        const storedHash = localStorage.getItem(KEYS.installPasswordHash);
        if (!storedHash) return false;
        return _safeEqual(storedHash, _hashSecret(password));
    }

    function setInstallPassword(password) {
        const normalized = _normalizeSecret(password);
        if (normalized.length < 8) {
            throw new Error('INVALID_INSTALL_PASSWORD');
        }
        localStorage.setItem(KEYS.installPasswordHash, _hashSecret(normalized));
    }

    // --- User Management ---
    function loginUser(firstName, lastName, memberId = 'manual') {
        const user = { firstName: firstName, lastName: lastName, memberId: memberId };
        sessionStorage.setItem(KEYS.currentUser, JSON.stringify(user));
        return user;
    }

    function logoutUser() {
        sessionStorage.removeItem(KEYS.currentUser);
    }

    function getCurrentUser() {
        try {
            const data = sessionStorage.getItem(KEYS.currentUser);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    // --- CSV Export ---
    async function exportBookingsCSV() {
        const bookings = getBookings();
        if (bookings.length === 0) return null;

        var lines = [];
        lines.push('ID;Typ;Produkt;Preis;Nutzer;Zeitpunkt');
        for (var i = 0; i < bookings.length; i++) {
            var b = bookings[i];
            var date = new Date(b.timestamp);
            var formatted = date.toLocaleString('de-DE');
            var userName = b.userName || 'Unbekannt';
            var priceStr = b.price.toFixed(2).replace('.', ',');
            var typStr = b.type === 'snack' ? 'Snack' : 'Getränk';
            lines.push(b.id + ';' + typStr + ';' + b.productName + ';' + priceStr + ';' + userName + ';' + formatted);
        }
        var csvContent = '\uFEFF' + lines.join('\r\n');

        // Build filename: HHMM-DDMMYYYY-export_snackautomat.csv
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mi = String(now.getMinutes()).padStart(2, '0');
        var dd = String(now.getDate()).padStart(2, '0');
        var mo = String(now.getMonth() + 1).padStart(2, '0');
        var yyyy = now.getFullYear();
        var filename = hh + mi + '-' + dd + mo + yyyy + '-export_snackautomat.csv';

        // Try native File System Access API (shows OS save dialog)
        if (window.showSaveFilePicker) {
            try {
                var handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'CSV-Datei',
                        accept: { 'text/csv': ['.csv'] }
                    }]
                });
                var writable = await handle.createWritable();
                await writable.write(csvContent);
                await writable.close();
                return true;
            } catch (e) {
                // User cancelled the dialog
                if (e.name === 'AbortError') return 'cancelled';
                // If API fails, fall through to blob approach
                console.warn('showSaveFilePicker failed, using fallback:', e);
            }
        }

        // Fallback: Blob download
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 10000);
        return true;
    }

    // --- API Configuration ---
    function isApiConfigured() {
        const url = _normalizeSecret(localStorage.getItem(KEYS.apiUrl));
        const token = _normalizeSecret(localStorage.getItem(KEYS.jwtToken));
        return !!url && !!token;
    }

    function getApiConfig() {
        return {
            url: _normalizeSecret(localStorage.getItem(KEYS.apiUrl)) || 'http://localhost:8124',
            token: _normalizeSecret(localStorage.getItem(KEYS.jwtToken))
        };
    }

    function setApiConfig(url, token) {
        localStorage.setItem(KEYS.apiUrl, _normalizeSecret(url));
        localStorage.setItem(KEYS.jwtToken, _normalizeSecret(token));
    }

    return {
        init,
        getSnacks, setSnacks, updateSnack,
        getDrinks, setDrinks, addDrink, updateDrink, removeDrink,
        getBookings, addBooking, clearBookings,
        isPinConfigured, checkPin, setPin,
        isInstallPasswordConfigured, checkInstallPassword, setInstallPassword,
        loginUser, logoutUser, getCurrentUser,
        exportBookingsCSV,
        isApiConfigured, getApiConfig, setApiConfig
    };
})();

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Store };
}
