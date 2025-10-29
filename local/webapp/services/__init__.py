"""Service layer helpers for the Snackautomat web frontend."""

from .backend_api import BackendAPI, BackendAPIError, Product

__all__ = ["BackendAPI", "BackendAPIError", "Product"]
