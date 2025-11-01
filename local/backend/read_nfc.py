import subprocess

def read_uid():
    p1 = subprocess.Popen(["nfc-poll"], stdout=subprocess.PIPE, text=True)
    p2 = subprocess.Popen(["awk", "/UID/ {print $3$4$5$6$7$8$9; exit}"], stdin=p1.stdout, stdout=subprocess.PIPE,
                          text=True)
    p1.stdout.close()
    out = p2.communicate()[0].strip()
    return out or None

print(read_uid())
