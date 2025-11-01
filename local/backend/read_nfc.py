# read_nfc.py
# PN532 via libnfc/nfcpy over SPI (no Blinka needed)
# Requires: sudo apt-get install libnfc-bin libnfc-examples
#           pip install nfcpy
# libnfc config (e.g. /etc/nfc/libnfc.conf):
#   allow_intrusive_scan = true
#   device.name = "PN532 over SPI"
#   device.connstring = "pn532_spi:/dev/spidev0.0"

import os
import sys
import binascii

try:
    import nfc
except ImportError as e:
    sys.stderr.write("nfcpy nicht installiert. Installiere mit: pip install nfcpy\n")
    raise

# Default to the libnfc SPI PN532 on CE0. Overridable via env var PN532_DEV.
CONNSTRING = os.environ.get("PN532_DEV", "spi:pn532:/dev/spidev0.0")

def _on_connect(tag):
    # Many tag types expose .identifier as the UID/serial
    uid = getattr(tag, "identifier", None)
    if uid is None:
        print("Kein UID-Feld gefunden")
    else:
        print("UID:", binascii.hexlify(uid).decode().upper())
    # Return False to disconnect after first tag
    return False

def read_once():
    """Open, wait for one tag, print UID, then exit with code 0 on success."""
    try:
        with nfc.ContactlessFrontend(CONNSTRING) as clf:
            ok = clf.connect(rdwr={'on-connect': _on_connect})
            return 0 if ok is not None else 1
    except Exception as e:
        sys.stderr.write(f"Fehler beim Zugriff auf PN532 ({CONNSTRING}): {e}\n")
        sys.stderr.write("Prüfen: SPI aktiv, /dev/spidev0.0 vorhanden, libnfc.conf korrekt.\n")
        return 2

if __name__ == "__main__":
    sys.exit(read_once())
