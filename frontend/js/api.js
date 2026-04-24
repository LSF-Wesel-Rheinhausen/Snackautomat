/**
 * api.js – Service für die Kommunikation mit der Broker-API
 * Nutzt die in Store konfigurierten API-Einstellungen (URL & JWT).
 */

const ApiService = (() => {
    
    // Hilfsfunktion für Fetch-Aufrufe mit Auth-Header
    async function _fetchApi(endpoint, options = {}) {
        const storeRef = typeof Store !== 'undefined' ? Store : globalThis.Store;
        const config = storeRef.getApiConfig();
        if (!config.url || !config.token) {
            console.error('API nicht konfiguriert. Bitte im Admin-Bereich URL und JWT-Token setzen.');
            throw new Error('API_NOT_CONFIGURED');
        }

        const url = `${config.url.replace(/\/+$/, '')}${endpoint}`;
        
        const headers = {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`API Error ${response.status} at ${endpoint}:`, errorData);
                throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Fetch API Error at ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Ruft alle Snacks (Reihen) vom Broker ab.
     * Nutzt den Endpunkt /getValidFUProducts 
     */
    async function getFilteredSnacks() {
        try {
            const productsObj = await _fetchApi('/getValidFUProducts');
            const rowsById = new Map();

            for (const [idStr, details] of Object.entries(productsObj)) {
                const designation = details.designation || '';
                const match = designation.match(/\[(\d+)\]\s*(.*)/);
                if (!match) continue;

                const rowId = parseInt(match[1], 10);
                if (!Number.isInteger(rowId) || rowId < 1 || rowId > 12) continue;

                const name = (match[2] || '').trim() || 'Leer';
                let price = 0;

                if (Array.isArray(details.prices) && details.prices.length > 0) {
                    price = parseFloat(details.prices[0].price) || 0;
                } else if (details.price_member != null) {
                    price = parseFloat(details.price_member) || 0;
                }

                rowsById.set(rowId, {
                    id: rowId,
                    name: name,
                    price: price,
                    rawId: idStr
                });
            }

            const snacksArray = [];
            for (let row = 1; row <= 12; row++) {
                if (rowsById.has(row)) {
                    snacksArray.push(rowsById.get(row));
                } else {
                    snacksArray.push({
                        id: row,
                        name: 'Leer',
                        price: 0
                    });
                }
            }

            return snacksArray;
            
        } catch (error) {
            console.error('getFilteredSnacks failed:', error);
            return [];
        }
    }

    /**
     * User Info über RFID abrufen
     */
    async function getUserInfo(rfidTag) {
        try {
            const response = await _fetchApi('/getUserInfo', {
                method: 'POST',
                body: JSON.stringify({ rfid_id: rfidTag })
            });
            // Erwartetes Format: {"member_id": "...", "firstname": "...", "lastname": "..."}
            // oder {"message": "User not found"} als Exception (geworfen in _fetchApi wenn Status 40x)
            return response;
        } catch (error) {
            console.error('getUserInfo failed:', error);
            return null;
        }
    }

    /**
     * Buchung durchführen
     */
    async function buyProduct(memberId, itemId, amount = 1) {
        try {
            const response = await _fetchApi('/Buy', {
                method: 'POST',
                body: JSON.stringify({
                    memberid: memberId.toString(),
                    itemid: itemId.toString(),
                    amount: amount
                })
            });
            return response;
        } catch (error) {
            console.error('buyProduct failed:', error);
            throw error;
        }
    }

    return {
        getFilteredSnacks,
        getUserInfo,
        buyProduct
    };

})();

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService };
}
