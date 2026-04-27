import jwt
import pytest

import api_caller

JWT_SECRET = "0123456789abcdef0123456789abcdef"


class FakeResponse:
    def __init__(self, json_data=None, text="Hello World"):
        self._json_data = json_data or {"ok": True}
        self.text = text
        self.raise_for_status_called = False

    def json(self):
        return self._json_data

    def raise_for_status(self):
        self.raise_for_status_called = True


def test_get_jwt_token_requires_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)

    with pytest.raises(TypeError):
        api_caller.get_jwt_token({"sub": "test"})


def test_get_jwt_token_encodes_payload(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)

    token = api_caller.get_jwt_token({"sub": "test"})

    assert jwt.decode(token, JWT_SECRET, algorithms=["HS256"])["sub"] == "test"


def test_get_user_by_rfid_posts_to_broker(monkeypatch):
    calls = []
    response = FakeResponse({"firstname": "Max"})
    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)
    monkeypatch.setenv("backendip", "https://broker.test")
    monkeypatch.setattr(api_caller.requests, "post", lambda *args, **kwargs: calls.append((args, kwargs)) or response)

    assert api_caller.get_user_by_rfid("TAG") == {"firstname": "Max"}
    assert calls[0][0][0] == "https://broker.test/getUserInfo"
    assert calls[0][1]["json"] == {"rfid_id": "TAG"}
    assert calls[0][1]["verify"] is True
    assert response.raise_for_status_called is True


def test_get_valid_products_gets_from_broker(monkeypatch):
    calls = []
    response = FakeResponse({"1": {"designation": "[1] Snack"}})
    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)
    monkeypatch.setenv("backendip", "https://broker.test")
    monkeypatch.setattr(api_caller.requests, "get", lambda *args, **kwargs: calls.append((args, kwargs)) or response)

    assert api_caller.get_valid_products() == {"1": {"designation": "[1] Snack"}}
    assert calls[0][0][0] == "https://broker.test/getValidFUProducts"


def test_get_product_posts_row(monkeypatch):
    calls = []
    response = FakeResponse({"articleid": "A1"})
    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)
    monkeypatch.setenv("backendip", "https://broker.test")
    monkeypatch.setattr(api_caller.requests, "post", lambda *args, **kwargs: calls.append((args, kwargs)) or response)

    assert api_caller.get_product("3") is response
    assert calls[0][0][0] == "https://broker.test/getSpecificProduct"
    assert calls[0][1]["json"] == {"row": "3"}


def test_set_new_sale_posts_booking(monkeypatch):
    calls = []
    response = FakeResponse({"booked": True})
    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)
    monkeypatch.setenv("backendip", "https://broker.test")
    monkeypatch.setattr(api_caller.requests, "post", lambda *args, **kwargs: calls.append((args, kwargs)) or response)

    assert api_caller.set_new_sale("7", "item-1", 2) == {"booked": True}
    assert calls[0][0][0] == "https://broker.test/Buy"
    assert calls[0][1]["json"] == {"memberid": "7", "itemid": "item-1", "amount": 2}


def test_test_connection_reflects_response_text(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)
    monkeypatch.setenv("backendip", "https://broker.test")
    monkeypatch.setattr(api_caller.requests, "get", lambda *_args, **_kwargs: FakeResponse(text="Hello World"))
    assert api_caller.test_connection() is True

    monkeypatch.setattr(api_caller.requests, "get", lambda *_args, **_kwargs: FakeResponse(text="Nope"))
    assert api_caller.test_connection() is False
