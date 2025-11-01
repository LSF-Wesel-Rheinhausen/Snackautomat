import board
import busio
from digitalio import DigitalInOut
import adafruit_pn532

spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
cs_pin = DigitalInOut(board.D5)  # anpassen, je nach Verdrahtung

pn532 = adafruit_pn532.PN532_SPI(spi, cs_pin, debug=False)
pn532.SAM_configuration()


def read_nfc():
    print("Warte auf Karte...")
    while True:
        uid = pn532.read_passive_target(timeout=0.5)
        if uid:
            print("UID:", "".join(f"{b:02X}" for b in uid))
            return "UID:", "".join(f"{b:02X}" for b in uid)