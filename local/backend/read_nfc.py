import subprocess

def read_uid():
    result = subprocess.run(
        ["nfc-poll"], capture_output=True, text=True
    )
    for line in result.stdout.splitlines():
        if "UID" in line:
            uid = line.split(":")[1].strip().replace(" ", "").upper()
            return uid
    return None

print(read_uid())
