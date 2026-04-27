# SAF-006: Snack-Mapping bildet nicht verlaesslich alle 12 Reihen ab

## Prioritaet

Mittel

## Befund

`SnacksView` beschreibt die Ansicht als 12 Reihen, `ApiService.getFilteredSnacks()` gibt jedoch nur die Zeilen zurueck, die im API-Response matchen. Fehlende Reihen werden nicht mit Platzhaltern aufgefuellt.

## Evidenz

- `js/snacks.js:1-3`
- `js/api.js:45-81`

## Auswirkung

- das Grid kann weniger als 12 reale Automatenreihen darstellen
- Positionslogik und Admin-Erwartung driften auseinander, sobald der Broker unvollstaendige Daten liefert

## Empfehlung

Die API-Antwort auf ein festes 12er-Grid normalisieren und fehlende Reihen explizit als leer markieren.

