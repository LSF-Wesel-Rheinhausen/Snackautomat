# SAF-004: Setup erlaubt leeren JWT, API-Layer verlangt ihn aber

## Prioritaet

Hoch

## Befund

Das First-Run-Setup akzeptiert einen leeren JWT-Token und speichert ihn als gueltige Konfiguration. Der API-Layer bricht spaeter jedoch jeden Request ab, sobald `config.token` leer ist.

## Evidenz

- `js/app.js:166-194`
- `js/api.js:11-15`

## Auswirkung

- die Ersteinrichtung kann erfolgreich abgeschlossen aussehen, obwohl API-Zugriffe danach garantiert fehlschlagen
- Fehlerbild tritt erst spaeter in Snack- und Scanner-Flows auf

## Empfehlung

Entweder JWT im Setup als Pflichtfeld markieren oder den API-Layer fuer tokenlose Endpunkte explizit unterstuetzen.

