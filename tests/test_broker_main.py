import pytest

import main as broker_main


@pytest.fixture()
def app(monkeypatch):
    broker_main.app.config.update(TESTING=True)
    return broker_main.app


def test_route_handlers_delegate_to_vf_data(app, monkeypatch):
    monkeypatch.setattr(broker_main.vf_data, "get_shop_items", lambda: {"all": True})
    monkeypatch.setattr(broker_main.vf_data, "get_fu_products", lambda: {"fu": True})
    monkeypatch.setattr(broker_main.vf_data, "get_valid_fu_products", lambda: {"valid": True})

    with app.test_request_context():
        assert broker_main.get_all_products.__wrapped__() == {"all": True}
        assert broker_main.get_fu_products.__wrapped__() == {"fu": True}
        assert broker_main.get_valid_f_products.__wrapped__() == {"valid": True}
        assert broker_main.test.__wrapped__() == "Hello World"


def test_buy_accepts_valid_items(app, monkeypatch):
    monkeypatch.setattr(
        broker_main.vf_data,
        "get_valid_fu_products",
        lambda: {"item-1": {"articleid": "A1"}},
    )
    monkeypatch.setattr(
        broker_main.vf_data,
        "set_new_sale",
        lambda buyer, amount, item: {"buyer": buyer, "amount": amount, "item": item},
    )

    with app.test_request_context(json={"memberid": "7", "itemid": "item-1", "amount": 2}):
        assert broker_main.test_buy.__wrapped__() == {"buyer": {"memberid": "7"}, "amount": 2, "item": {"articleid": "A1"}}


def test_buy_rejects_invalid_items(app, monkeypatch):
    monkeypatch.setattr(broker_main.vf_data, "get_valid_fu_products", lambda: {})

    with app.test_request_context(json={"memberid": "7", "itemid": "missing", "amount": 2}):
        response, status = broker_main.test_buy.__wrapped__()

    assert status == 400
    assert response == {"message": "Invalid item"}


def test_user_and_product_lookup(app, monkeypatch):
    monkeypatch.setattr(broker_main.vf_data, "get_user_info", lambda rfid: {"rfid": rfid})
    monkeypatch.setattr(
        broker_main.vf_data,
        "get_valid_fu_products",
        lambda: {
            "1": {"designation": "[1] Schoko"},
            "2": {"designation": "[2] Chips"},
        },
    )

    with app.test_request_context(json={"rfid_id": "TAG"}):
        assert broker_main.get_user_info.__wrapped__() == {"rfid": "TAG"}

    with app.test_request_context(json={"row": "2"}):
        assert broker_main.get_product.__wrapped__() == {"designation": "[2] Chips"}


def test_ensure_ssl_certificates_reuses_existing_files(tmp_path):
    cert = tmp_path / "cert.pem"
    key = tmp_path / "key.pem"
    cert.write_text("cert", encoding="utf-8")
    key.write_text("key", encoding="utf-8")

    assert broker_main.ensure_ssl_certificates(str(cert), str(key)) == (str(cert), str(key))
