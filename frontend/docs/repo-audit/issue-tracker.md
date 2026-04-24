# Issue Tracker

Stand: 2026-04-24

| ID | Prioritaet | Status | Titel |
| --- | --- | --- | --- |
| SAF-001 | Hoch | Behoben | `npm test` fuehrt die Tests nicht aus |
| SAF-002 | Hoch | Behoben | Vitest-Konfiguration und Test-Dateien sind inkonsistent |
| SAF-003 | Hoch | Behoben | Playwright-E2E-Suite prueft eine veraltete UI |
| SAF-004 | Hoch | Behoben | Setup erlaubt leeren JWT, API-Layer verlangt ihn aber |
| SAF-005 | Hoch | Teilweise behoben | Client-seitige Geheimnisse und schwacher lokaler Admin-Schutz |
| SAF-006 | Mittel | Behoben | Snack-Mapping bildet nicht verlaesslich alle 12 Reihen ab |

## Ablage

- `issues/SAF-001-npm-test-broken.md`
- `issues/SAF-002-vitest-misaligned.md`
- `issues/SAF-003-playwright-obsolete.md`
- `issues/SAF-004-jwt-setup-mismatch.md`
- `issues/SAF-005-client-side-secrets.md`
- `issues/SAF-006-snack-row-mapping.md`

## Rest-Risiko

`SAF-005` ist nur teilweise loesbar, solange die App als rein statisches Frontend ohne serverseitige Authentisierung betrieben wird.
