from types import SimpleNamespace

import read_nfc


def test_read_uid_extracts_uid_bytes(monkeypatch):
    monkeypatch.setattr(
        read_nfc.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(stdout="nfc-poll uses libnfc\nUID (NFCID1): 04 a1 B2 c3 d4\n"),
    )

    assert read_nfc.read_uid() == "04A1B2C3D4"


def test_read_uid_returns_none_when_no_uid_is_present(monkeypatch):
    monkeypatch.setattr(read_nfc.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(stdout="No target found"))

    assert read_nfc.read_uid() is None


def test_read_uid_invokes_nfc_poll_without_shell(monkeypatch):
    calls = []

    def fake_run(*args, **kwargs):
        calls.append((args, kwargs))
        return SimpleNamespace(stdout="")

    monkeypatch.setattr(read_nfc.subprocess, "run", fake_run)

    read_nfc.read_uid()

    assert calls[0][0][0] == ["nfc-poll"]
    assert calls[0][1].get("shell") is not True
