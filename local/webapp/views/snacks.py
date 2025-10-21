"""Flask blueprint responsible for rendering the snacks catalogue."""
from __future__ import annotations

from flask import Blueprint, current_app, render_template

from ..services.backend_api import BackendAPI, BackendAPIError


snacks_bp = Blueprint("snacks", __name__)


@snacks_bp.route("/snacks")
def snacks_overview():
    api: BackendAPI = current_app.config["BACKEND_API"]
    error_message = None
    products = []
    grouped = {}
    try:
        products = api.get_snacks()
        grouped = api.get_products_grouped_by_category(products)
    except BackendAPIError as exc:
        current_app.logger.warning("Could not render snacks page: %s", exc)
        error_message = str(exc)
    return render_template(
        "snacks.html",
        products=products,
        grouped_products=grouped,
        error_message=error_message,
    )
