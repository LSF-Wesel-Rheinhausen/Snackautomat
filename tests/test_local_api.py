import pytest

import local_api


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "production")
    local_api.app.config.update(TESTING=True)
    return local_api.app.test_client()


def test_buy_runs_worker_and_books_sale(client, monkeypatch):
    calls = []
    monkeypatch.setattr(local_api.worker, "run", lambda row: True)
    monkeypatch.setattr(
        local_api.api_caller,
        "set_new_sale",
        lambda **kwargs: calls.append(kwargs) or {"ok": True},
    )

    response = client.post("/buy", json={"row": "3", "memberid": "7"})

    assert response.status_code == 200
    assert response.get_json() == {"message": "3 processed successfully"}
    assert calls == [{"memberid": "7", "itemid": "3", "amount": 1}]


def test_buy_reports_worker_failures(client, monkeypatch):
    monkeypatch.setattr(local_api.worker, "run", lambda row: "GRBL Error")

    response = client.post("/buy", json={"row": "3", "memberid": "7"})

    assert response.status_code == 500
    assert "Failed to process" in response.get_json()["error"]


def test_get_product_list_returns_products_or_empty_on_error(client, monkeypatch):
    monkeypatch.setattr(local_api.api_caller, "get_valid_products", lambda: {"1": {"name": "Snack"}})
    assert client.get("/get_product_list").get_json() == {"1": {"name": "Snack"}}

    monkeypatch.setattr(local_api.api_caller, "get_valid_products", lambda: (_ for _ in ()).throw(RuntimeError("offline")))
    response = client.get("/get_product_list")
    assert response.status_code == 500
    assert response.get_json() == {}


def test_get_user_info_uses_uppercase_nfc_id(client, monkeypatch):
    monkeypatch.setattr(local_api.read_nfc, "read_uid", lambda: "tag-1")
    monkeypatch.setattr(local_api.api_caller, "get_user_by_rfid", lambda rfid: {"rfid": rfid})

    response = client.get("/get_user_info")

    assert response.status_code == 200
    assert response.get_json() == {"rfid": "TAG-1"}


def test_get_user_info_handles_missing_nfc(client, monkeypatch):
    monkeypatch.setattr(local_api.read_nfc, "read_uid", lambda: None)

    response = client.get("/get_user_info")

    assert response.status_code == 500
    assert response.get_json() == {"error": "Failed to read NFC tag"}


def test_health_check_validates_environment_and_broker(client, monkeypatch):
    monkeypatch.delenv("FLASK_ENV", raising=False)
    assert client.get("/health").status_code == 500

    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.setattr(local_api.api_caller, "test_connection", lambda: False)
    assert client.get("/health").status_code == 500

    monkeypatch.setattr(local_api.api_caller, "test_connection", lambda: True)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_wifi_list_filters_and_limits(client, monkeypatch):
    monkeypatch.setattr(
        local_api.wifi_manager,
        "list_wifi",
        lambda iface=None: [
            {"ssid": "Weak", "signal": 20},
            {"ssid": "Strong", "signal": 80},
        ],
    )

    response = client.get("/wifi/list?min_signal=50&limit=1")

    assert response.status_code == 200
    assert response.get_json() == {"count": 1, "results": [{"ssid": "Strong", "signal": 80}]}


def test_wifi_connect_validates_and_connects(client, monkeypatch):
    calls = []
    monkeypatch.setattr(
        local_api.wifi_manager,
        "wifi_connect",
        lambda **kwargs: calls.append(kwargs) or "wlan0",
    )

    assert client.post("/wifi/connect", json={}).status_code == 400
    response = client.post(
        "/wifi/connect",
        json={"ssid": "Club", "password": "secret", "bssid": "AA:BB", "hidden": True},
    )

    assert response.status_code == 201
    assert response.get_json()["iface"] == "wlan0"
    assert calls == [{"ssid": "Club", "password": "secret", "iface": None, "bssid": "AA:BB", "hidden": True}]


def test_ota_update_currently_reports_not_implemented(client):
    response = client.get("/ota")

    assert response.status_code == 500
    assert response.get_json() == {"message": "OTA update failed"}
