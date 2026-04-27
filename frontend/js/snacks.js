/**
 * snacks.js – Snack-Buchungsansicht
 * Rendert 12 Snack-Reihen und verarbeitet Buchungen.
 */

const SnacksView = (() => {
    let container = null;

    async function init() {
        container = document.getElementById('snacks-grid');
        container.innerHTML = '<div class="loading-spinner" style="text-align: center; padding: 2rem;">Lade Snack-Reihen...</div>';
        
        // Try fetching from API first
        let snacks = await ApiService.getFilteredSnacks();
        
        if (snacks && snacks.length > 0) {
            // Update local fallback store with latest API data
            Store.setSnacks(snacks);
        } else {
            // API failed or not configured, fallback to local
            snacks = Store.getSnacks();
            console.warn('API fetch failed or no products. Using local fallback snacks data.');
        }

        render(snacks);
    }

    function render(snacks = Store.getSnacks()) {
        if (!container || !document.body.contains(container)) {
            container = document.getElementById('snacks-grid');
        }
        container.innerHTML = '';

        snacks.forEach((snack, index) => {
            const isPlaceholderRow = snack.name === 'Leer' && !snack.rawId;
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('role', 'article');
            card.setAttribute('aria-label', `Reihe ${snack.id}: ${snack.name}, ${snack.price.toFixed(2)} Euro`);

            card.innerHTML = `
                <div class="product-card__row-badge">Reihe ${snack.id}</div>
                <div class="product-card__icon">${getSnackEmoji(index)}</div>
                <h3 class="product-card__name">${escapeHtml(snack.name)}</h3>
                <div class="product-card__price">${snack.price.toFixed(2).replace('.', ',')} €</div>
                <button class="btn btn--primary product-card__btn" 
                        data-snack-id="${snack.id}" 
                        id="snack-btn-${snack.id}"
                        ${isPlaceholderRow ? 'disabled' : ''}
                        aria-label="${snack.name} buchen für ${snack.price.toFixed(2)} Euro">
                    ${isPlaceholderRow ? 'Nicht belegt' : 'Buchen'}
                </button>
            `;

            const btn = card.querySelector('button');
            // Wir speichern die rohe API ID auf dem Button für die Buchung
            if (snack.rawId) {
                btn.dataset.rawId = snack.rawId;
            }
            btn.addEventListener('click', () => bookSnack(snack, btn));

            container.appendChild(card);
        });
    }

    async function bookSnack(snack, btn) {
        if (snack.name === 'Leer' && !snack.rawId) {
            return;
        }

        const user = Store.getCurrentUser();
        if (!user) {
            alert('Bitte melde dich zuerst an!');
            return;
        }

        const originalText = btn.textContent;
        btn.textContent = 'Wird gebucht...';
        btn.disabled = true;

        try {
            // Try API Booking if we have an API ID and a real member ID (not 'manual')
            if (snack.rawId && user.memberId && user.memberId !== 'manual') {
                await ApiService.buyProduct(user.memberId, snack.rawId, 1);
            } else if (user.memberId === 'manual') {
                console.warn('Manuelle Anmeldung aktiv. Buchung wird nur lokal simuliert (API-Buchung übersprungen).');
            } else if (!snack.rawId) {
                console.warn('Keine valide API-ID für diesen Snack gefunden. Buchung wird nur lokal simuliert.');
            }

            Store.addBooking('snack', snack);
            
            // Animation Success
            btn.classList.add('btn--success');
            btn.textContent = '✓ Gebucht!';

        } catch (error) {
            console.error('Fehler bei der API Buchung:', error);
            alert('Buchung fehlgeschlagen: ' + error.message);
            btn.classList.add('btn--danger');
            btn.textContent = '❌ Fehler';
        }

        setTimeout(() => {
            btn.classList.remove('btn--success', 'btn--danger');
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    }

    function getSnackEmoji(index) {
        const emojis = ['🍫', '🥔', '🍬', '🥜', '🍪', '🥜', '🧇', '🍿', '🥨', '🍇', '🥗', '🍘'];
        return emojis[index] || '🍿';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { init, render };
})();

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SnacksView };
}
