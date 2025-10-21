"""Flask blueprint responsible for rendering the drinks catalogue."""
from __future__ import annotations

from flask import Blueprint, current_app, render_template

from ..services.backend_api import BackendAPI, BackendAPIError


drinks_bp = Blueprint("drinks", __name__)


@drinks_bp.route("/drinks")
def drinks_overview():
    api: BackendAPI = current_app.config["BACKEND_API"]
    error_message = None
    products = []
    grouped = {}
    try:
        products = api.get_drinks()
        grouped = api.get_products_grouped_by_category(products)
    except BackendAPIError as exc:
        current_app.logger.warning("Could not render drinks page: %s", exc)
        error_message = str(exc)
    return render_template(
        "drinks.html",
        products=products,
        grouped_products=grouped,
        error_message=error_message,
    )
