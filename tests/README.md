# Test strategy

The unit tests cover application logic without requiring snack machine hardware.

Hardware-facing modules are tested at their boundaries:

- NFC reader logic mocks `subprocess.run` and verifies UID parsing plus safe command invocation.
- Wi-Fi logic mocks `nmcli` output and verifies interface selection, network parsing, and command creation.
- GRBL/serial logic mocks serial ports and verifies row-to-command decisions.

These tests intentionally do not require a real NFC reader, Wi-Fi adapter, GRBL controller, relay board, or Raspberry Pi GPIO stack. Real hardware checks should be handled as manual acceptance tests or dedicated integration tests on the target device.
