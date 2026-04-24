import re
import subprocess

UID_BYTE_PATTERN = re.compile(r"\b[0-9A-Fa-f]{2}\b")

def read_uid():
    result = subprocess.run(
        ["nfc-poll"],
        capture_output=True,
        text=True,
        check=False,
    )
    for line in result.stdout.splitlines():
        if "UID" not in line:
            continue
        uid_bytes = UID_BYTE_PATTERN.findall(line)
        if uid_bytes:
            return "".join(uid_bytes).upper()
    return None
