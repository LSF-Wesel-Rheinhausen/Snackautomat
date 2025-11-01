import subprocess

def read_uid():
    cmd = "nfc-poll | awk '/UID/ {print $3$4$5$6$7$8$9; exit}'"
    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True
    )
    uid = result.stdout.strip()
    return uid or None


print(read_uid())
