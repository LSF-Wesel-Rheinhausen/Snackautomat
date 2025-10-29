"""Flask application factory for the Snackautomat touchscreen frontend."""
from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, redirect, url_for

if __package__ in {None, ""}:  # pragma: no cover - defensive path setup for script execution
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    __package__ = "local.webapp"

from local.webapp.services.backend_api import BackendAPI
from local.webapp.views.admin import admin_bp
from local.webapp.views.drinks import drinks_bp
from local.webapp.views.snacks import snacks_bp


log_level = os.getenv("WEBAPP_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level, logging.INFO))


def create_app(config: dict | None = None) -> Flask:
    """Create and configure the Flask application instance.

    Parameters
    ----------
    config:
        Optional dictionary that will be merged into the application
        configuration. This is primarily intended for tests where a mocked
        backend service should be injected.
    """

    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )

    secret_key = os.getenv("FLASK_SECRET_KEY") or app.config.get("SECRET_KEY") or "dev-secret"

    app.config.from_mapping(
        SECRET_KEY=secret_key,
        PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
        BACKEND_API=BackendAPI(),
    )

    if config:
        app.config.update(config)

    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("Flask SECRET_KEY must not be empty")

    app.register_blueprint(drinks_bp)
    app.register_blueprint(snacks_bp)
    app.register_blueprint(admin_bp)

    @app.route("/")
    def index():
        return redirect(url_for("drinks.drinks_overview"))

    @app.context_processor
    def inject_navigation():
        return {
            "navigation": [
                {"label": "Getränke", "endpoint": "drinks.drinks_overview"},
                {"label": "Snacks", "endpoint": "snacks.snacks_overview"},
                {"label": "Admin", "endpoint": "admin.dashboard"},
            ]
        }

    @app.context_processor
    def inject_defaults():
        return {"current_year": datetime.now().year}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("WEBAPP_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
