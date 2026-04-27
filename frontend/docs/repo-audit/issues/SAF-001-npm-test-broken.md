# SAF-001: `npm test` fuehrt die Tests nicht aus

## Prioritaet

Hoch

## Befund

Das Repo deklariert Vitest und Playwright als Dev-Dependencies, aber `package.json` enthaelt weiterhin das Platzhalter-Script `echo "Error: no test specified" && exit 1`.

## Evidenz

- `package.json:7`
- Tatsaechliche Ausgabe bei der Pruefung: `Error: no test specified` und danach ein Shell-Fehler durch uebergebene Zusatzargumente

## Auswirkung

- lokale Qualitaetssicherung funktioniert nicht ueber den Standard-Einstiegspunkt
- CI-Aufbau und Onboarding werden unnoetig fragil

## Empfehlung

Test-Skripte sauber aufteilen, z. B. `test`, `test:unit`, `test:e2e`.

