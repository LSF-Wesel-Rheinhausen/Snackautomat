/**
 * scanner.js – Web Serial API Integration für den RFID Scanner
 * Verbindet sich mit dem COM/UART Port des Scanners und liest RFID-Tags ein.
 */

const ScannerService = (() => {
    let port;
    let reader;
    let keepReading = true;
    let onScanCallback = null;

    /**
     * Startet den Serial-Port Auswahl-Dialog und verbindet sich.
     */
    async function connect() {
        if (!('serial' in navigator)) {
            alert('Web Serial API wird von diesem Browser nicht unterstützt. Bitte nutze Chrome oder Edge.');
            return false;
        }

        try {
            // Fordert den Nutzer auf, einen seriellen Port zu wählen
            port = await navigator.serial.requestPort();
            
            // Konfiguration für typische RFID UART Scanner (häufig 9600 Baud)
            await port.open({ baudRate: 9600 });
            
            console.log('RFID Scanner erfolgreich verbunden!');
            keepReading = true;
            
            // Starte den Leseprozess im Hintergrund
            _readLoop();
            
            return true;
        } catch (error) {
            console.error('Fehler bei der Scanner-Verbindung:', error);
            if (error.name === 'NotFoundError') {
                // User cancelled the prompt
                return false;
            }
            alert('Konnte nicht mit dem Scanner verbinden: ' + error.message);
            return false;
        }
    }

    /**
     * Trennt die Verbindung zum Scanner.
     */
    async function disconnect() {
        if (port) {
            keepReading = false;
            if (reader) {
                try {
                    await reader.cancel();
                } catch (_) {
                    // Reader might already be closed.
                }
            }
            await port.close();
            port = null;
            console.log('Scanner getrennt.');
        }
    }

    /**
     * Interne Schleife zum kontinuierlichen Auslesen des seriellen Streams.
     */
    async function _readLoop() {
        while (port && port.readable && keepReading) {
            // Nutze TextDecoderStream um die Bytes als String zu lesen
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
            reader = textDecoder.readable.getReader();

            let buffer = '';

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        keepReading = false;
                        break;
                    }

                    if (value) {
                        buffer += value;
                        // UART Scanner schicken oft einen Zeilenumbruch (CR/LF) am Ende des Tags
                        if (buffer.includes('\n') || buffer.includes('\r')) {
                            const tags = buffer.split(/[\r\n]+/);
                            // Letztes (unvollständiges) Element im Buffer lassen
                            buffer = tags.pop(); 
                            
                            tags.forEach(tag => {
                                const cleanTag = tag.trim();
                                if (cleanTag && onScanCallback) {
                                    console.log('RFID Tag gescannt:', cleanTag);
                                    onScanCallback(cleanTag);
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Fehler beim Lesen vom Scanner:', error);
                keepReading = false;
            } finally {
                reader.releaseLock();
                await readableStreamClosed.catch(() => {});
            }
        }
    }

    /**
     * Setzt den Callback, der aufgerufen wird, wenn ein Chip gescannt wurde.
     */
    function setOnScanCallback(callback) {
        onScanCallback = callback;
    }

    /**
     * Gibt zurück, ob der Scanner verbunden ist.
     */
    function isConnected() {
        return !!port;
    }

    return {
        connect,
        disconnect,
        setOnScanCallback,
        isConnected
    };

})();

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScannerService };
}
