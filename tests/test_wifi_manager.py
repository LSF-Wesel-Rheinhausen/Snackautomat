import pytest

import wifi_manager


def test_detect_wifi_iface_prefers_connected(monkeypatch):
    monkeypatch.setattr(
        wifi_manager,
        "run",
        lambda _cmd: "eth0:ethernet:connected\nwlan0:wifi:disconnected\nwlan1:wifi:connected",
    )

    assert wifi_manager.detect_wifi_iface() == "wlan1"


def test_detect_wifi_iface_uses_available_candidate(monkeypatch):
    monkeypatch.setattr(wifi_manager, "run", lambda _cmd: "wlan0:wifi:unavailable\nwlan1:wifi:disconnected")

    assert wifi_manager.detect_wifi_iface() == "wlan0"


def test_detect_wifi_iface_raises_without_wifi(monkeypatch):
    monkeypatch.setattr(wifi_manager, "run", lambda _cmd: "eth0:ethernet:connected")

    with pytest.raises(wifi_manager.WifiError):
        wifi_manager.detect_wifi_iface()


def test_list_wifi_parses_networks(monkeypatch):
    def fake_run(cmd):
        if "device status" in cmd:
            return "wlan0:wifi:connected"
        return "\n".join(
            [
                "*:ClubNet:AA\\:BB\\:CC\\:DD\\:EE\\:FF:78:WPA2",
                ":OpenNet:11\\:22\\:33\\:44\\:55\\:66:not-a-number:",
                "::00\\:00\\:00\\:00\\:00\\:00:99:WPA2",
            ]
        )

    monkeypatch.setattr(wifi_manager, "run", fake_run)

    assert wifi_manager.list_wifi() == [
        {"ssid": "ClubNet", "bssid": "AA:BB:CC:DD:EE:FF", "signal": 78, "security": "WPA2", "in_use": True},
        {"ssid": "OpenNet", "bssid": "11:22:33:44:55:66", "signal": None, "security": None, "in_use": False},
    ]


def test_wifi_connect_builds_nmcli_command(monkeypatch):
    calls = []
    monkeypatch.setattr(wifi_manager, "detect_wifi_iface", lambda: "wlan0")
    monkeypatch.setattr(wifi_manager, "run", lambda cmd: calls.append(cmd) or "")

    assert wifi_manager.wifi_connect("Club Net", "secret", bssid="AA:BB", hidden=True) is True
    assert calls == ['nmcli device wifi connect "Club Net" password "secret" ifname wlan0 bssid AA:BB hidden yes']


def test_wifi_forget_ignores_missing_profiles(monkeypatch):
    def fake_run(_cmd):
        raise wifi_manager.WifiError("unknown connection")

    monkeypatch.setattr(wifi_manager, "run", fake_run)

    assert wifi_manager.wifi_forget("missing") is False
