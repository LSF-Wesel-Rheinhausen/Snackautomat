# Admin-Modus & Export im lokalen Frontend

## Admin API (lokaler Service)
- `GET /admin/sales_backend_mode`
- `PUT /admin/sales_backend_mode` mit `{ "mode": "vereinsflieger" | "local_db" }`
- `GET /orders/export?...` (Proxy auf Broker)

## Tkinter Frontend
Das Frontend enthält ein **Admin-Fenster** mit:
- Anzeige des aktiven Modus
- Umschalten zwischen `vereinsflieger` und `local_db`
- Export von Bestellungen als JSON oder CSV
- optionalen Filtern (`from`, `to`, `memberid`)

## Hinweis
Der lokale Service agiert als Proxy, damit das Frontend nur einen Host kennen muss.
