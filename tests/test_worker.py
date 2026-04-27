from types import SimpleNamespace

import worker


class FakeSerial:
    def __init__(self, responses):
        self.responses = responses
        self.writes = []
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def readlines(self):
        return self.responses

    def write(self, command):
        self.writes.append(command)

    def readline(self):
        return b"ok\r\n"

    def close(self):
        self.closed = True


def test_check_port_for_grbl_sends_axis_command(monkeypatch):
    serial_instances = []

    def fake_serial(*_args, **_kwargs):
        serial = FakeSerial([b"Grbl 1.1\r\n"])
        serial_instances.append(serial)
        return serial

    relay_calls = []
    monkeypatch.setattr(worker.serial, "Serial", fake_serial)
    monkeypatch.setattr(worker, "relay", lambda row: relay_calls.append(row))

    result = worker.check_port_for_grbl(SimpleNamespace(device="/dev/ttyUSB0"), "6")

    assert result == "/dev/ttyUSB0"
    assert relay_calls == [2]
    assert serial_instances[0].writes == [b"$J=G21G91Y0.8F60\r\n"]


def test_check_port_for_grbl_ignores_non_grbl_devices(monkeypatch):
    monkeypatch.setattr(worker.serial, "Serial", lambda *_args, **_kwargs: FakeSerial([b"hello\r\n"]))

    assert worker.check_port_for_grbl(SimpleNamespace(device="/dev/ttyUSB0"), "1") is None


def test_find_and_connect_to_grbl_filters_relevant_ports(monkeypatch):
    ports = [
        SimpleNamespace(device="/dev/ttyS0"),
        SimpleNamespace(device="/dev/ttyUSB0"),
        SimpleNamespace(device="COM3"),
    ]
    checked = []
    monkeypatch.setattr(worker.list_ports, "comports", lambda: ports)

    def fake_check(port, axis):
        checked.append((port.device, axis))
        return port.device if port.device == "COM3" else None

    monkeypatch.setattr(worker, "check_port_for_grbl", fake_check)

    assert worker.find_and_connect_to_grbl("10") == "COM3"
    assert checked == [("/dev/ttyUSB0", "10"), ("COM3", "10")]


def test_run_reports_success_or_grbl_error(monkeypatch):
    monkeypatch.setattr(worker, "find_and_connect_to_grbl", lambda axis: "/dev/ttyUSB0")
    assert worker.run("1") is True

    monkeypatch.setattr(worker, "find_and_connect_to_grbl", lambda axis: None)
    assert worker.run("1") == "GRBL Error"
