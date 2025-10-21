"""Flask application factory for the Snackautomat touchscreen frontend."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

from flask import Flask, redirect, url_for

from .services.backend_api import BackendAPI
from .views.admin import admin_bp
from .views.drinks import drinks_bp
from .views.snacks import snacks_bp


log_level = os.getenv("WEBAPP_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level, logging.INFO))


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )
    app.config.setdefault("SECRET_KEY", os.getenv("FLASK_SECRET_KEY", "dev-secret"))
    app.config.setdefault("PERMANENT_SESSION_LIFETIME", timedelta(hours=12))
    app.config.setdefault("BACKEND_API", BackendAPI())

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
