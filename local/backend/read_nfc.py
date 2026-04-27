import subprocess

def read_uid():
    """Read an NFC UID in a shell-safe way from nfc-poll output."""
    result = subprocess.run(["nfc-poll"], capture_output=True, text=True, check=False)
    for line in result.stdout.splitlines():
        if "UID" not in line:
            continue
        uid = "".join(part for part in line.split()[1:] if part.isalnum())
        if uid:
            return uid
    return None
