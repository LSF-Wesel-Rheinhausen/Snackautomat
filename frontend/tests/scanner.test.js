import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
const { ScannerService } = require('../js/scanner');

describe('ScannerService', () => {
    let mockPort;
    let mockReader;

    beforeEach(() => {
        vi.clearAllMocks();

        mockReader = {
            read: vi.fn(),
            releaseLock: vi.fn(),
            cancel: vi.fn().mockResolvedValue()
        };

        mockPort = {
            open: vi.fn().mockResolvedValue(),
            close: vi.fn().mockResolvedValue(),
            readable: {
                pipeTo: vi.fn().mockResolvedValue()
            }
        };

        global.navigator = {
            serial: {
                requestPort: vi.fn().mockResolvedValue(mockPort)
            }
        };

        global.TextDecoderStream = class {
            constructor() {
                this.writable = {};
                this.readable = {
                    getReader: vi.fn().mockReturnValue(mockReader)
                };
            }
        };
    });

    afterEach(async () => {
        await ScannerService.disconnect();
    });

    it('should expose disconnected state by default', () => {
        expect(ScannerService.isConnected()).toBe(false);
    });

    it('should connect and process one scanned tag', async () => {
        mockReader.read
            .mockResolvedValueOnce({ value: 'TAG-12345\n', done: false })
            .mockResolvedValueOnce({ value: undefined, done: true });

        const callback = vi.fn();
        ScannerService.setOnScanCallback(callback);

        const connected = await ScannerService.connect();
        expect(connected).toBe(true);
        expect(navigator.serial.requestPort).toHaveBeenCalled();
        expect(mockPort.open).toHaveBeenCalledWith({ baudRate: 9600 });

        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(callback).toHaveBeenCalledWith('TAG-12345');
    });

    it('should return false if browser does not support serial api', async () => {
        const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
        global.navigator.serial = undefined;
        const connected = await ScannerService.connect();
        expect(connected).toBe(false);
        expect(alertSpy).toHaveBeenCalled();
        alertSpy.mockRestore();
    });
});
