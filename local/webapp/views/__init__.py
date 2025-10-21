"""Blueprint registrations for the Snackautomat web frontend."""

from .admin import admin_bp
from .drinks import drinks_bp
from .snacks import snacks_bp

__all__ = ["admin_bp", "drinks_bp", "snacks_bp"]
