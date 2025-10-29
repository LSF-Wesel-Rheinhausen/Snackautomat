"""Web frontend package for the Snackautomat project."""
from .app import create_app  # re-export for convenience

__all__ = ["create_app"]
