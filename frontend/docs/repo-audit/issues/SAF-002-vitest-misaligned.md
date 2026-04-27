# SAF-002: Vitest-Konfiguration und Test-Dateien sind inkonsistent

## Prioritaet

Hoch

## Befund

Die Vitest-Konfiguration verweist auf `./tests/setup.js`, diese Datei existiert jedoch nicht. Stattdessen liegt eine Datei `tests/setup 2.js` vor. Dazu kommen Dateinamen mit Leerzeichen wie `tests/scanner 2.test.js`, was auf ungepflegte Altstaende und umbenannte Testartefakte hindeutet.

## Evidenz

- `vitest.config.js:6`
- `tests/setup 2.js`
- `tests/scanner 2.test.js`

## Auswirkung

- Unit-Tests sind nicht reproduzierbar startbar
- Testfehler sind schwer von reiner Test-Infrastruktur zu unterscheiden

## Empfehlung

Test-Dateien vereinheitlichen, Dateinamen bereinigen und den konfigurierten Setup-Pfad wieder mit der realen Struktur synchronisieren.

