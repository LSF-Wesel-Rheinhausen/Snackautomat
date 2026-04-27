# Sales Backend Mode (Broker)

## Ziel
Der Broker kann Bestellungen entweder direkt an Vereinsflieger buchen (`vereinsflieger`) oder nur lokal in einer SQLite-Datenbank speichern (`local_db`).

## Modusverwaltung
- API: `GET /admin/sales-backend-mode`
- API: `PUT /admin/sales-backend-mode` mit JSON `{ "mode": "vereinsflieger" | "local_db" }`
- Persistenz in SQLite-Tabelle `settings` (`sales_backend_mode`).

## Verhaltensregeln
- `vereinsflieger`: bestehender Vereinsflieger-Flow bleibt aktiv und unverändert.
- `local_db`: keine Vereinsflieger-Buchung; Bestellung wird nur lokal gespeichert.
- In beiden Modi wird die Bestellung in `orders` protokolliert (Audit/Export).

## Sicherheit
- Endpunkte sind JWT-geschützt.
- Ungültige Modi werden mit `400` abgelehnt.

## Datenbank
Standardpfad: `broker/data/orders.db` (über `ORDER_DB_PATH` überschreibbar).
