"""Helper classes to interact with the local Snackautomat frontend API for the web frontend.

The module exposes :class:`BackendAPI` which talks to the lightweight Flask API
provided by :mod:`local.frontend_api`.  Responses are normalised so that the
Flask views can operate on a predictable data structure while still reusing the
same categorisation logic as the Tkinter frontend.
"""
from __future__ import annotations

import logging
import os
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence
from urllib.parse import urljoin

import requests

logger = logging.getLogger(__name__)


DEFAULT_DRINK_CATEGORIES = {"drink", "getraenk", "getränk", "beverage", "drinks"}
DEFAULT_SNACK_CATEGORIES = {"snack", "snacks", "food", "essen"}
DEFAULT_DRINK_KEYWORDS = {
    "cola",
    "wasser",
    "water",
    "saft",
    "juice",
    "bier",
    "beer",
    "mate",
    "limon",
    "energy",
}
DEFAULT_SNACK_KEYWORDS = {
    "chips",
    "riegel",
    "bar",
    "snack",
    "cookie",
    "keks",
    "nuss",
    "nut",
    "schoko",
}


def _parse_csv_env(name: str, default: Iterable[str]) -> List[str]:
    """Return a list of comma separated values from an environment variable."""

    value = os.getenv(name)
    if not value:
        return [*default]
    return [item.strip().lower() for item in value.split(",") if item.strip()]


@dataclass
class Product:
    """Normalised representation of a product retrieved from the backend."""

    product_id: str
    name: str
    price: Optional[float]
    price_label: str
    unit: Optional[str]
    category: Optional[str]
    raw: Dict

    @property
    def display_category(self) -> str:
        if self.category:
            return self.category
        return "Allgemein"


class BackendAPIError(RuntimeError):
    """Raised when the backend API could not be reached or returned invalid data."""


class BackendAPI:
    """High level access to the local frontend API used by the Flask frontend."""

    def __init__(
        self,
        *,
        cache_ttl: int = 30,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        session: Optional[requests.Session] = None,
    ) -> None:
        self._cache_ttl = cache_ttl
        self._products_cache: Optional[Dict[str, object]] = None
        self._drink_categories = set(_parse_csv_env("WEBAPP_DRINK_CATEGORIES", DEFAULT_DRINK_CATEGORIES))
        self._snack_categories = set(_parse_csv_env("WEBAPP_SNACK_CATEGORIES", DEFAULT_SNACK_CATEGORIES))
        self._drink_keywords = set(_parse_csv_env("WEBAPP_DRINK_KEYWORDS", DEFAULT_DRINK_KEYWORDS))
        self._snack_keywords = set(_parse_csv_env("WEBAPP_SNACK_KEYWORDS", DEFAULT_SNACK_KEYWORDS))
        self._base_url = (base_url or os.getenv("FRONTEND_API_URL", "http://127.0.0.1:5001")).rstrip("/") + "/"
        self._timeout = timeout if timeout is not None else float(os.getenv("WEBAPP_API_TIMEOUT", "5"))
        self._session = session or requests.Session()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def get_products(self, *, force_refresh: bool = False) -> List[Product]:
        """Return the cached list of products from the backend."""

        cached = self._products_cache
        if not force_refresh and cached and (time.time() - cached["timestamp"]) < self._cache_ttl:
            return cached["products"]  # type: ignore[return-value]

        try:
            params = {"refresh": "1"} if force_refresh else None
            raw_products = self._request_json("GET", "products", params=params)
        except BackendAPIError:
            raise
        except Exception as exc:  # pragma: no cover - network error handling
            logger.exception("Unable to fetch products from frontend API")
            raise BackendAPIError("Fehler beim Abrufen der Produktliste") from exc

        products = self._normalise_products(raw_products)
        self._products_cache = {"timestamp": time.time(), "products": products}
        return products

    def refresh_products(self) -> List[Product]:
        """Force a refresh of the product cache and return the fresh list."""

        return self.get_products(force_refresh=True)

    def get_drinks(self) -> List[Product]:
        """Return all products categorised as drinks."""

        return [product for product in self.get_products() if self._is_drink(product)]

    def get_snacks(self) -> List[Product]:
        """Return all products categorised as snacks."""

        return [product for product in self.get_products() if self._is_snack(product)]

    def get_products_grouped_by_category(self, products: Optional[Iterable[Product]] = None) -> Dict[str, List[Product]]:
        """Group the given products by their display category for easier rendering."""

        if products is None:
            products = self.get_products()
        grouped: Dict[str, List[Product]] = defaultdict(list)
        for product in products:
            grouped[product.display_category].append(product)
        return dict(sorted(grouped.items(), key=lambda item: item[0].lower()))

    def get_user_by_rfid(self, rfid: str) -> Dict:
        """Return backend information for the given RFID code."""

        try:
            return self._request_json("POST", "login", json={"rfid": rfid})
        except Exception as exc:  # pragma: no cover - network error handling
            logger.exception("RFID lookup failed")
            raise BackendAPIError("RFID konnte nicht nachgeschlagen werden") from exc

    def create_sale(self, member_id: str, item_id: str, amount: int = 1) -> Dict:
        """Trigger a new sale via the backend."""

        try:
            return self._request_json(
                "POST",
                "sales",
                json={"memberid": member_id, "itemid": item_id, "amount": amount},
                expected_status=(200, 201),
            )
        except Exception as exc:  # pragma: no cover - network error handling
            logger.exception("Unable to create sale")
            raise BackendAPIError("Verkauf konnte nicht erstellt werden") from exc

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _normalise_products(self, raw_products) -> List[Product]:
        """Convert different backend formats into :class:`Product` objects."""

        candidates: Iterable
        if isinstance(raw_products, dict):
            if isinstance(raw_products.get("items"), list):
                candidates = raw_products["items"]
            elif all(isinstance(value, dict) for value in raw_products.values()):
                candidates = raw_products.values()
            else:
                candidates = raw_products.get("data", [])
        elif isinstance(raw_products, list):
            candidates = raw_products
        else:
            logger.warning("Unexpected product payload: %s", type(raw_products))
            return []

        normalised: List[Product] = []
        for item in candidates:
            if not isinstance(item, dict):
                logger.debug("Skipping non-dict product entry: %r", item)
                continue
            product_id = self._first_not_none(
                item.get("productid"),
                item.get("product_id"),
                item.get("articleid"),
                item.get("itemid"),
                item.get("row"),
                item.get("id"),
            )
            name = self._first_not_none(item.get("name"), item.get("designation"), item.get("label"))
            if not product_id or not name:
                logger.debug("Skipping product without id or name: %s", item)
                continue

            price, unit = self._extract_price(item)
            category = self._normalise_category(item)
            normalised.append(
                Product(
                    product_id=str(product_id),
                    name=str(name),
                    price=price,
                    price_label=self._format_price(price, item),
                    unit=unit,
                    category=category,
                    raw=item,
                )
            )
        return normalised

    @staticmethod
    def _first_not_none(*values):
        for value in values:
            if value not in (None, ""):
                return value
        return None

    @staticmethod
    def _extract_price(item: Dict) -> (Optional[float], Optional[str]):
        price_value = item.get("price") or item.get("unitprice") or item.get("price_value")
        unit = item.get("unit") or item.get("unittype")
        if price_value is None and isinstance(item.get("prices"), list) and item["prices"]:
            first_price = item["prices"][0]
            if isinstance(first_price, dict):
                price_value = first_price.get("unitprice") or first_price.get("price")
        try:
            if price_value is None:
                return None, unit
            return float(price_value), unit
        except (TypeError, ValueError):
            logger.debug("Price value could not be converted: %r", price_value)
            return None, unit

    @staticmethod
    def _format_price(price: Optional[float], item: Dict) -> str:
        currency = item.get("currency", "€")
        if price is None:
            return "Preis auf Anfrage"
        return f"{price:0.2f} {currency}"

    def _normalise_category(self, item: Dict) -> Optional[str]:
        category = item.get("category") or item.get("product_group") or item.get("type")
        if isinstance(category, dict):
            category = category.get("name") or category.get("title")
        if isinstance(category, str) and category.strip():
            return category.strip()
        return None

    def _is_drink(self, product: Product) -> bool:
        return self._matches_category(product, self._drink_categories, self._drink_keywords)

    def _is_snack(self, product: Product) -> bool:
        return self._matches_category(product, self._snack_categories, self._snack_keywords)

    def _matches_category(self, product: Product, categories: Iterable[str], keywords: Iterable[str]) -> bool:
        category = (product.category or "").lower()
        if category and any(cat in category for cat in categories):
            return True

        name = product.name.lower()
        if any(keyword in name for keyword in keywords):
            return True
        return False

    # ------------------------------------------------------------------
    # HTTP helpers
    # ------------------------------------------------------------------
    def _build_url(self, path: str) -> str:
        return urljoin(self._base_url, path)

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        expected_status: Sequence[int] = (200,),
        **kwargs,
    ):
        url = self._build_url(path)
        try:
            response = self._session.request(method, url, timeout=self._timeout, **kwargs)
        except requests.RequestException as exc:
            raise BackendAPIError("Lokale Frontend-API nicht erreichbar") from exc

        if response.status_code not in expected_status:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text.strip()
            raise BackendAPIError(f"Frontend-API Fehler ({response.status_code}): {detail}")

        try:
            return response.json()
        except ValueError as exc:
            raise BackendAPIError("Ungueltige JSON-Antwort von der Frontend-API") from exc
