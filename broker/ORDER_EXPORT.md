# Order Export

## Zweck
Exportiert ausschließlich vom Automaten ausgelöste Bestellungen aus der lokalen SQLite-Datenbank.

## Endpoint
`GET /export/orders?format=json|csv&from=YYYY-MM-DD&to=YYYY-MM-DD&memberid=...`

## Parameter
- `format`: `json` oder `csv` (Pflicht, default `json`)
- `from`: optional, Filter `bookingdate >= from`
- `to`: optional, Filter `bookingdate <= to`
- `memberid`: optional, exakter Filter

## Antwort
- JSON: `application/json`
- CSV: `text/csv` + Download Header

## Exportierte Felder
`id, created_at_utc, source, memberid, itemid, articleid, amount, bookingdate, vf_response_json`
