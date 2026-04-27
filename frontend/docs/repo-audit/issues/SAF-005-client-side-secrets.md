# SAF-005: Client-seitige Geheimnisse und schwacher lokaler Admin-Schutz

## Prioritaet

Hoch

## Befund

Das Installationspasswort ist fest im Frontend hinterlegt und damit fuer jeden mit Browser-Zugriff sichtbar. Zusaetzlich wird die Admin-PIN lokal im Browser gespeichert, standardmaessig auf `1234` gesetzt und nur per Gleichheitsvergleich geprueft.

## Evidenz

- `js/app.js:148`
- `js/store.js:41`
- `js/store.js:71-73`
- `js/store.js:152-158`

## Auswirkung

- Schutzmechanismen lassen sich leicht auslesen oder lokal manipulieren
- Ersteinrichtung und Admin-Bereich bieten keinen belastbaren Zugriffsschutz

## Empfehlung

Geheimnisse aus dem Client entfernen, Admin-Authentisierung an ein Backend koppeln und mindestens einen sicheren Rotations-/Initialisierungsprozess vorsehen.

