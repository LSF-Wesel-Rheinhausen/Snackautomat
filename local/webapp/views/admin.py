"""Admin blueprint with lightweight management functionality for the web UI."""
from __future__ import annotations

import os
from functools import wraps
from typing import Any, Dict, Optional

from flask import (
    Blueprint,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

from ..services.backend_api import BackendAPI, BackendAPIError


admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def _admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not session.get("is_admin"):
            flash("Bitte melden Sie sich mit der Admin-PIN an.", "warning")
            return redirect(url_for("admin.login", next=request.url))
        return func(*args, **kwargs)

    return wrapper


@admin_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        provided_pin = request.form.get("pin", "")
        required_pin = os.getenv("WEBAPP_ADMIN_PIN", "")
        if not required_pin:
            flash("Keine Admin-PIN konfiguriert. Bitte setzen Sie WEBAPP_ADMIN_PIN.", "danger")
        elif provided_pin == required_pin:
            session["is_admin"] = True
            flash("Erfolgreich angemeldet.", "success")
            next_url = request.args.get("next") or url_for("admin.dashboard")
            return redirect(next_url)
        else:
            flash("Ungültige PIN.", "danger")
    return render_template("admin_login.html")


@admin_bp.route("/logout")
@_admin_required
def logout():
    session.pop("is_admin", None)
    flash("Abgemeldet.", "info")
    return redirect(url_for("admin.login"))


@admin_bp.route("/", methods=["GET", "POST"])
@_admin_required
def dashboard():
    api: BackendAPI = current_app.config["BACKEND_API"]
    rfid_lookup: Optional[Dict[str, Any]] = None
    sale_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

    if request.method == "POST":
        action = request.form.get("action")
        try:
            if action == "lookup_rfid":
                rfid_code = request.form.get("rfid", "").strip()
                if not rfid_code:
                    flash("Bitte eine RFID eingeben.", "warning")
                else:
                    rfid_lookup = api.get_user_by_rfid(rfid_code)
                    flash("RFID-Abfrage erfolgreich.", "success")
            elif action == "create_sale":
                member_id = request.form.get("member_id", "").strip()
                item_id = request.form.get("item_id", "").strip()
                amount = int(request.form.get("amount", "1"))
                if not member_id or not item_id:
                    flash("Mitglieds- und Artikel-ID werden benötigt.", "warning")
                else:
                    sale_result = api.create_sale(member_id, item_id, amount)
                    flash("Testverkauf ausgelöst.", "success")
            elif action == "refresh_products":
                api.refresh_products()
                flash("Produktliste aktualisiert.", "info")
        except ValueError:
            flash("Bitte eine gültige Menge eingeben.", "danger")
        except BackendAPIError as exc:
            error_message = str(exc)
            flash(error_message, "danger")

    products = api.get_products()
    return render_template(
        "admin_dashboard.html",
        products=products,
        rfid_lookup=rfid_lookup,
        sale_result=sale_result,
        error_message=error_message,
    )
