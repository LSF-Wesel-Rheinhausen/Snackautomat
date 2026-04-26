import json
from datetime import date

import pytest

import vf_data


def test_get_fu_products_filters_snackautomat_rows(monkeypatch):
    monkeypatch.setattr(
        vf_data,
        "get_shop_items_cached",
        lambda: {
            "1": {"articleid": "Snackautomat Reihe 1", "designation": "[1] Schoko"},
            "2": {"articleid": "Other", "designation": "[2] Other"},
            "meta": "ignored",
        },
    )

    assert vf_data.get_fu_products() == {"1": {"articleid": "Snackautomat Reihe 1", "designation": "[1] Schoko"}}


def test_get_valid_fu_products_keeps_only_current_prices(monkeypatch):
    class FixedDateTime:
        @classmethod
        def now(cls):
            class FixedNow:
                @staticmethod
                def date():
                    return date(2026, 4, 24)

            return FixedNow()

        @staticmethod
        def strptime(value, fmt):
            from datetime import datetime

            return datetime.strptime(value, fmt)

    monkeypatch.setattr(vf_data, "datetime", FixedDateTime)
    monkeypatch.setattr(
        vf_data,
        "get_fu_products",
        lambda: {
            "valid": {
                "articleid": "Snackautomat Reihe 1",
                "designation": "[1] Schoko",
                "prices": [
                    {"validfrom": "2026-01-01", "validto": "2026-12-31", "price": "1.50"},
                    {"validfrom": "2025-01-01", "validto": "2025-12-31", "price": "0.50"},
                ],
            },
            "invalid": {
                "articleid": "Snackautomat Reihe 2",
                "designation": "[2] Alt",
                "prices": [{"validfrom": "2025-01-01", "validto": "2025-12-31"}],
            },
            "broken": {
                "articleid": "Snackautomat Reihe 3",
                "designation": "[3] Broken",
                "prices": [{"validfrom": "bad", "validto": "2026-12-31"}],
            },
            "meta": "ignored",
        },
    )

    result = vf_data.get_valid_fu_products()

    assert list(result) == ["valid"]
    assert result["valid"]["prices"] == [{"validfrom": "2026-01-01", "validto": "2026-12-31", "price": "1.50"}]


def test_get_user_info_finds_user_by_key(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "token.json").write_text(
        json.dumps(
            [
                {"firstname": "Max", "keymanagement": [{"keyname": "TAG-1"}]},
                {"firstname": "Erika", "keymanagement": [{"keyname": "TAG-2"}]},
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    assert vf_data.get_user_info("TAG-2")["firstname"] == "Erika"
    assert vf_data.get_user_info("missing") == {"message": "User not found"}


def test_get_shop_items_returns_connection_error_on_failed_login(monkeypatch):
    monkeypatch.setattr(vf_data, "_api_url", "https://api.example/")
    monkeypatch.setattr(vf_data, "login", lambda: (_ for _ in ()).throw(ConnectionError("offline")))

    assert vf_data.get_shop_items() == vf_data.CON_ERROR


def test_set_new_sale_posts_expected_payload(monkeypatch):
    posted = {}
    monkeypatch.setattr(vf_data, "login", lambda: "access-token")

    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {"ok": True}

    def fake_post(url, data):
        posted["url"] = url
        posted["payload"] = json.loads(data)
        return Response()

    monkeypatch.setattr(vf_data.requests, "post", fake_post)
    monkeypatch.setattr(vf_data, "_api_url", "https://api.example/")

    assert vf_data.set_new_sale({"memberid": "7"}, 2, {"articleid": "A1"}) == {"ok": True}
    assert posted["url"] == "https://api.example/interface/rest/sale/add"
    assert posted["payload"]["memberid"] == 7
    assert posted["payload"]["amount"] == 2


def test_set_new_sale_returns_connection_error_on_bad_status(monkeypatch):
    monkeypatch.setattr(vf_data, "login", lambda: "access-token")
    monkeypatch.setattr(vf_data, "_api_url", "https://api.example/")

    class Response:
        status_code = 500

    monkeypatch.setattr(vf_data.requests, "post", lambda *_args, **_kwargs: Response())

    assert vf_data.set_new_sale({"memberid": "7"}, 1, {"articleid": "A1"}) == vf_data.CON_ERROR
