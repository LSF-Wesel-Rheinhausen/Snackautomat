"""SQLite persistence for order history and runtime broker settings."""

from __future__ import annotations

import csv
import io
import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from typing import Any

ALLOWED_BACKEND_MODES = {"vereinsflieger", "local_db"}
DEFAULT_BACKEND_MODE = "vereinsflieger"

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DB_PATH = os.getenv("ORDER_DB_PATH", os.path.join(_BASE_DIR, "data", "orders.db"))


def _get_connection() -> sqlite3.Connection:
    """Create a sqlite3 connection with row factory enabled."""
    os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create required settings and orders tables if they do not yet exist."""
    with closing(_get_connection()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at_utc TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at_utc TEXT NOT NULL,
                source TEXT NOT NULL,
                memberid TEXT NOT NULL,
                itemid TEXT NOT NULL,
                articleid TEXT,
                amount INTEGER NOT NULL,
                bookingdate TEXT NOT NULL,
                vf_response_json TEXT
            )
            """
        )
        conn.commit()


def _utc_now_iso() -> str:
    """Return current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()


def get_sales_backend_mode() -> str:
    """Return currently configured sales backend mode."""
    init_db()
    with closing(_get_connection()) as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", ("sales_backend_mode",)).fetchone()
        if row and row["value"] in ALLOWED_BACKEND_MODES:
            return row["value"]

    env_mode = os.getenv("SALES_BACKEND_MODE", DEFAULT_BACKEND_MODE).strip().lower()
    if env_mode not in ALLOWED_BACKEND_MODES:
        env_mode = DEFAULT_BACKEND_MODE
    set_sales_backend_mode(env_mode)
    return env_mode


def set_sales_backend_mode(mode: str) -> str:
    """Persist and return sales backend mode."""
    normalized = (mode or "").strip().lower()
    if normalized not in ALLOWED_BACKEND_MODES:
        allowed = ", ".join(sorted(ALLOWED_BACKEND_MODES))
        raise ValueError(f"Invalid mode '{mode}'. Allowed values: {allowed}")

    init_db()
    with closing(_get_connection()) as conn:
        conn.execute(
            """
            INSERT INTO settings(key, value, updated_at_utc)
            VALUES(?, ?, ?)
            ON CONFLICT(key)
            DO UPDATE SET value = excluded.value, updated_at_utc = excluded.updated_at_utc
            """,
            ("sales_backend_mode", normalized, _utc_now_iso()),
        )
        conn.commit()
    return normalized


def record_order(
    *,
    source: str,
    memberid: str,
    itemid: str,
    articleid: str | None,
    amount: int,
    bookingdate: str,
    vf_response: dict[str, Any] | None,
) -> int:
    """Insert one order row and return its generated database id."""
    init_db()
    with closing(_get_connection()) as conn:
        cursor = conn.execute(
            """
            INSERT INTO orders(
                created_at_utc, source, memberid, itemid, articleid, amount, bookingdate, vf_response_json
            )
            VALUES(?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _utc_now_iso(),
                source,
                str(memberid),
                str(itemid),
                articleid,
                int(amount),
                bookingdate,
                json.dumps(vf_response, ensure_ascii=False) if vf_response is not None else None,
            ),
        )
        conn.commit()
        return int(cursor.lastrowid)


def list_orders(*, from_date: str | None = None, to_date: str | None = None, memberid: str | None = None) -> list[dict[str, Any]]:
    """Return persisted orders with optional booking-date/member filter."""
    init_db()
    where: list[str] = []
    params: list[Any] = []

    if from_date:
        where.append("bookingdate >= ?")
        params.append(from_date)
    if to_date:
        where.append("bookingdate <= ?")
        params.append(to_date)
    if memberid:
        where.append("memberid = ?")
        params.append(str(memberid))

    query = "SELECT * FROM orders"
    if where:
        query += " WHERE " + " AND ".join(where)
    query += " ORDER BY id DESC"

    with closing(_get_connection()) as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
    return [dict(row) for row in rows]


def orders_to_csv(orders: list[dict[str, Any]]) -> str:
    """Serialize order rows to CSV text."""
    buffer = io.StringIO()
    fieldnames = [
        "id",
        "created_at_utc",
        "source",
        "memberid",
        "itemid",
        "articleid",
        "amount",
        "bookingdate",
        "vf_response_json",
    ]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for order in orders:
        writer.writerow({name: order.get(name) for name in fieldnames})
    return buffer.getvalue()
