/**
 * drinks.js – Getränke-Buchungsansicht
 * Rendert Getränkeliste und verarbeitet Buchungen (nur Buchung, keine Ausgabe).
 */

const DrinksView = (() => {
    let container = null;

    function init() {
        container = document.getElementById('drinks-grid');
        render();
    }

    function render() {
        const drinks = Store.getDrinks();
        container.innerHTML = '';

        if (drinks.length === 0) {
            container.innerHTML = '<p class="empty-message">Keine Getränke konfiguriert. Bitte im Admin-Bereich hinzufügen.</p>';
            return;
        }

        drinks.forEach((drink, index) => {
            const card = document.createElement('div');
            card.className = 'product-card product-card--drink';
            card.setAttribute('role', 'article');
            card.setAttribute('aria-label', `${drink.name}, ${drink.price.toFixed(2)} Euro`);

            card.innerHTML = `
                <div class="product-card__icon">${getDrinkEmoji(index)}</div>
                <h3 class="product-card__name">${escapeHtml(drink.name)}</h3>
                <div class="product-card__price">${drink.price.toFixed(2).replace('.', ',')} €</div>
                <span class="product-card__hint">Nur Buchung – keine Ausgabe</span>
                <button class="btn btn--secondary product-card__btn" 
                        data-drink-id="${drink.id}" 
                        id="drink-btn-${drink.id}"
                        aria-label="${drink.name} buchen für ${drink.price.toFixed(2)} Euro">
                    Buchen
                </button>
            `;

            const btn = card.querySelector('button');
            btn.addEventListener('click', () => bookDrink(drink, btn));

            container.appendChild(card);
        });
    }

    function bookDrink(drink, btn) {
        Store.addBooking('drink', drink);
        
        btn.classList.add('btn--success');
        btn.textContent = '✓ Gebucht!';
        btn.disabled = true;

        setTimeout(() => {
            btn.classList.remove('btn--success');
            btn.textContent = 'Buchen';
            btn.disabled = false;
        }, 1500);
    }

    function getDrinkEmoji(index) {
        const emojis = ['🥤', '💧', '🧃', '🍵', '🍊', '☕', '🥛', '🍺'];
        return emojis[index] || '🥤';
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
    module.exports = { DrinksView };
}
