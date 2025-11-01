# Snackautomat — Frontend

Projekt: Snackautomat LSF Wesel‑Rheinhausen
Version: 1.0 — Stand: 21. Oktober 2025
Maintainer: LSF Wesel‑Rheinhausen Entwicklerteam
Repository: github.com/LSF-Wesel-Rheinhausen/Snackautomat

Kurzbeschreibung
-----------------
Das Frontend stellt die Benutzeroberfläche für den vereinsinternen Snackautomaten bereit. Es läuft auf einem Raspberry Pi mit Touchdisplay und wird als statische Web‑App vom Python/Flask‑Backend (localhost) gehostet, welches über einen Broker die Verkäufe in Vereinsflieger bucht. Ziel ist ein robustes, wartbares, barrierefreies und sicheres UI, das Verkaufsvorgänge, Admin‑Funktionen unterstützt.

Ziele
-----
- Stabiles, schnelles UI für Verkaufsvorgänge (Startzeit < 5 s, Reaktionszeit < 100 ms)
- Integration der NFC‑Schnittstelle über das Backend
- Admin‑Dashboard: PIN‑geschützt, Slot‑Tests, Preisverwaltung, Sync, OTA‑Updates
- Vollständige Build‑Artefakte, die vom Flask‑Backend ausgeliefert werden

Technologieübersicht
--------------------
- Framework: Vue 3 (Composition API) mit TypeScript
- Schreibweise: <script setup lang="ts">
- UI‑Komponenten: PrimeVue 4
- Styling: Vanilla CSS (kein Tailwind/SCSS), theming über PrimeVue‑Theme
- Bundler: Vite (Erzeugt statische Dateien in `dist`)
- Testing: Unit => Vitest, Komponenten => Vue Test Utils, E2E => Playwright (empfohlen)
- State Management: Pinia

Datei‑/Komponentenstruktur (Empfehlung)
--------------------------------------
- `src/`
  - `pages/` — Routenseiten (Start, Auswahl, Checkout, Bestätigung, Admin)
  - `components/` — Wiederverwendbare UI‑Bausteine (Card, Button, Modal, SlotTest)
  - `layouts/` — App‑Layouts (KioskLayout, AdminLayout)
  - `composables/` — Wiederverwendbare Logik (useApi, useNfc, useAdmin)
  - `stores/` — Pinia Stores (session, items, admin)
  - `assets/` — Bilder, Icons, Fonts
  - `main.ts` — App Bootstrap (PrimeVue Setup, Router, Store)

Wichtige Anforderungen an das UI
-------------------------------
1. Nutzer‑Flows
   - Snack‑Kauf: Startbildschirm → NFC-Login → Produktauswahl → Ausgabe+Buchung → Bestätigung der Ausgabe auf dem Display und Danke für die Nutzung der Packstation
   - Admin‑Modus: PIN‑eingabe (nur verfügbar für Spezielle NutzerIDs) → Admin‑Dashboard (Slot‑Test, Sync, OTA, Sperren)
   - Home Assistant: Status, Temperatur, Türzustand, Sperrschalter (anzeigen/aktualisieren)
   - Netzwerk-Einstellungen: Im Admin Modus sollten die Netzwerkeinstellungen geändert werden können und ein anderes Wifi verbunden werden können

2. Barrierefreiheit & UX
   - Touchoptimiertes Layout, große Buttons, hoher Kontrast
   - Fokus‑Management und Bildschirmleser‑Kompatibilität
   - Schriftgrößen, Farben und Abstände konsistent

3. Performance
   - Startzeit < 5 s auf Raspberry Pi Zielhardware
   - Interaktionslatenz < 100 ms (lokale API Calls zu Backend auf localhost)
   - Optimierte Assets (Bilder, SVGs), Code‑Splitting für große Routen

4. Sicherheit
   - Keine sensiblen Daten in Code oder im lokalen Storage
   - Keine direkte Hardwaresteuerung im Frontend — nur über Backend auf localhost

Design‑ und UI‑Richtlinien
-------------------------
- Nutze PrimeVue Komponenten nur dort, wo sie Accessibility‑ und Performanceanforderungen erfüllen
- Konsistente Farbpalette, kontrastreich und touchfreundlich
- Animationen dezent und performant (prefer CSS transitions), aber gerne genutzt für moderne UX

Entwicklung — Setup (Kurz)
--------------------------
1. Grundvoraussetzung: Node.js, npm/yarn
2. Abhängigkeiten installieren: `npm install` (in `frontend/`)
3. Dev Server: `npm run dev` (Vite — HMR für schnellstes Feedback)
4. Build für Produktion: `npm run build` → erzeugt `dist/`

Wichtig: Die erzeugten statischen Dateien werden vom Python/Flask‑Backend gehostet. Abstimmung mit `backend/` erforderlich: Zielpfad und CORS/Headers (CSP) abstimmen. Das Backend wird zu einer Flask API umgebaut.

Build/Deployment
----------------
- `npm run build` erzeugt die Produktionsartefakte (z. B. `dist/`)
- Artefakte in das vom Flask‑Server erwartete Verzeichnis kopieren (z. B. `backend/static/` oder konfigurierter Pfad)
- Backend auf Raspberry Pi stellt statische Dateien aus und leitet API‑Requests an den Flask‑Server weiter (localhost)

Testing & Qualitätssicherung
----------------------------
- Unit Tests (Vitest) für Composables und Komponenten‑Logik
- Komponententests (Vue Test Utils) für kritische UI‑Elemente
- E2E Tests (Playwright) für Nutzerflüsse: Kauf, Admin‑Login, Slot‑Test
- Linting: ESLint + TypeScript Regeln

CI / CD
-------
- Pipeline sollte: install → lint → test → build → artefakte speichern → deploy (Raspberry Pi)
- Rollbacks: Build‑Artefakte versionieren und sichere Rollback‑Route im Backend

Checklist für Pull Requests
---------------------------
- [ ] TypeScript ohne Fehler (`tsc --noEmit`)
- [ ] Linter läuft fehlerfrei
- [ ] Unit‑Tests bestehen
- [ ] E2E Tests für kritische Pfade (falls betroffen) bestehen
- [ ] Keine Secrets im Commit
- [ ] Accessibility‑Basics geprüft (Kontrast, Fokus)

Offene Punkte / Empfehlungen
---------------------------
- Pinia als zentraler Store für Session/Warenkorb empfohlen
- Session‑Management: kurzlebige Token + In‑Memory Speicherung
- Monitoring/Logging: Frontend Errors an Backend / Sentry‑ähnlichen Dienst (optional intern)

Frontend Implementierung (Stand 2025-10-21)
------------------------------------------
- Einstiegspunkt: `local/frontend/index.html`, gebundled via Vite (`dist/`)
- Vue 3 + TypeScript mit PrimeVue 4 für UI, Pinia für State, Vue Router für Flows
- Entwicklungsstart: `npm install` & `npm run dev` (Port 4173, `--host 0.0.0.0`)
- Qualität: `npm run build` (führt `vue-tsc` + Produktionsbuild), `npm run test:unit` (Vitest)
- Hauptpfade:
  - `src/pages/kiosk/` — Benutzerflow (Landing, Scan, Katalog, Checkout, Confirmation)
  - `src/pages/admin/` — Admin-Login & Dashboard (PIN-Pad, Slot-Tests, Netzwerk)
  - `src/stores/` — Pinia Stores (`session`, `items`, `admin`)
  - `src/composables/` — Backend-Integration (`useApi`, `useNfc`, `useMachineStatus`)
- Assets liegen in `public/` (z. B. Logo) und `src/assets/` (Stile, Fonts)
- API Basis-URL: `VITE_API_BASE_URL` (Fallback `/api`), erwartete Endpunkte siehe Stores/Composables

Kontakt / Maintainer
--------------------
LSF Wesel‑Rheinhausen Entwicklerteam — GitHub: `github.com/LSF-Wesel-Rheinhausen/Snackautomat`

Lizenz
------
Projektintern; Lizenzhinweise und Drittlibraries in `package.json` und LICENSE (sofern vorhanden) prüfen.

Änderungshistorie
-----------------
- 1.0 — Initiale Anforderungs‑README (21. Oktober 2025)
