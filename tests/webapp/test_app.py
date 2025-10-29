from __future__ import annotations

from typing import Any, Dict, List, Optional

import pytest

from local.webapp.app import create_app


class DummyBackend:
    def __init__(self) -> None:
        self.refresh_called = False

    # Drinks & snacks -----------------------------------------------------
    def get_drinks(self) -> List[Any]:
        return []

    def get_snacks(self) -> List[Any]:
        return []

    def get_products_grouped_by_category(self, products: Optional[Any] = None) -> Dict[str, List[Any]]:
        return {}

    # Admin ---------------------------------------------------------------
    def get_products(self, *, force_refresh: bool = False) -> List[Any]:
        return []

    def refresh_products(self) -> List[Any]:
        self.refresh_called = True
        return []

    def get_user_by_rfid(self, rfid: str) -> Dict[str, Any]:
        return {"rfid": rfid, "member_id": "123"}

    def create_sale(self, member_id: str, item_id: str, amount: int = 1) -> Dict[str, Any]:
        return {"member_id": member_id, "item_id": item_id, "amount": amount}


@pytest.fixture
def dummy_backend() -> DummyBackend:
    return DummyBackend()


@pytest.fixture
def app(monkeypatch: pytest.MonkeyPatch, dummy_backend: DummyBackend):
    monkeypatch.delenv("FLASK_SECRET_KEY", raising=False)
    app = create_app({"TESTING": True, "BACKEND_API": dummy_backend})
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


def test_app_uses_default_secret_key(app):
    assert app.config["SECRET_KEY"] == "dev-secret"


def test_app_honours_env_secret_key(monkeypatch: pytest.MonkeyPatch, dummy_backend: DummyBackend):
    monkeypatch.setenv("FLASK_SECRET_KEY", "super-secret")
    app = create_app({"TESTING": True, "BACKEND_API": dummy_backend})
    assert app.config["SECRET_KEY"] == "super-secret"


def test_drinks_page_renders(client):
    response = client.get("/drinks")
    assert response.status_code == 200
    assert b"Getr\xc3\xa4nke" in response.data


def test_admin_dashboard_requires_login(client):
    response = client.get("/admin/")
    assert response.status_code == 302
    assert "/admin/login" in response.headers["Location"]


def test_admin_login_sets_session(monkeypatch: pytest.MonkeyPatch, dummy_backend: DummyBackend):
    monkeypatch.setenv("WEBAPP_ADMIN_PIN", "1234")
    app = create_app({"TESTING": True, "BACKEND_API": dummy_backend})

    with app.test_client() as test_client:
        response = test_client.post("/admin/login", data={"pin": "1234"})
        assert response.status_code == 302
        assert response.headers["Location"].endswith("/admin/")
        with test_client.session_transaction() as session:
            assert session.get("is_admin") is True
