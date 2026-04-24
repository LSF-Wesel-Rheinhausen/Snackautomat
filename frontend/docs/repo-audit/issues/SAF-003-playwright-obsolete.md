# SAF-003: Playwright-E2E-Suite prueft eine veraltete UI

## Prioritaet

Hoch

## Befund

Die E2E-Tests sprechen DOM-IDs, Storage-Keys und Flows an, die im aktuellen Frontend nicht mehr existieren. Beispiele sind `#login-screen`, `#app-screen`, `#btn-manual-login`, `#setup-jwt-token` oder die alten Keys `snackautomat_api_url` und `admin_pin`.

## Evidenz

- `tests-e2e/app.spec.js:34`
- `tests-e2e/app.spec.js:43`
- `tests-e2e/app.spec.js:79`
- `tests-e2e/admin.spec.js:19`
- Aktuelle Implementierung nutzt u. a. `#user-login-screen`, `#main-app`, `#setup-api-jwt`, `snackautomat_apiUrl`, `snackautomat_pin`

## Auswirkung

- die E2E-Suite liefert keinen belastbaren Schutz gegen Regressionen
- ein Gruen in Playwright waere aktuell kein Signal fuer funktionierende User-Flows

## Empfehlung

Die E2E-Tests an die aktuelle UI und die aktuelle Storage-Schema-Definition anpassen oder die veralteten Specs voruebergehend deaktivieren.

