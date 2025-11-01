import subprocess
import shlex

class WifiError(RuntimeError):
    pass

def run(cmd: str) -> str:
    proc = subprocess.run(shlex.split(cmd), text=True, capture_output=True)
    if proc.returncode != 0:
        raise WifiError((proc.stderr or proc.stdout).strip())
    return proc.stdout.strip()

def detect_wifi_iface() -> str:
    """
    Ermittelt das Wi-Fi-Interface über NetworkManager.
    Präferenz: verbunden > getrennt aber verfügbar.
    """
    # nmcli device status: DEVICE  TYPE  STATE  CONNECTION
    out = run("nmcli -t -f DEVICE,TYPE,STATE device status")
    candidates = []
    for line in out.splitlines():
        parts = line.split(":")
        if len(parts) < 3:
            continue
        dev, typ, state = parts[0], parts[1], parts[2]
        if typ != "wifi":
            continue
        if state.lower() == "connected":
            return dev
        candidates.append((state.lower(), dev))
    if candidates:
        # nimm ein verfügbares oder getrenntes WLAN-Interface
        for state, dev in candidates:
            if state in {"disconnected", "unavailable", "connecting"}:
                return dev
        return candidates[0][1]
    raise WifiError("Kein Wi-Fi-Interface gefunden. Prüfe, ob NetworkManager läuft und ein WLAN-Adapter vorhanden ist.")

def list_wifi(iface: str | None = None):
    """
    Liefert eine Liste von Netzwerken: [{'ssid': str, 'signal': int|None, 'security': str|None, 'bssid': str|None}]
    """
    iface = iface or detect_wifi_iface()
    # -t = tabellarisch, Felder: IN-USE,SSID,BSSID,SIGNAL,SECURITY
    out = run(f"nmcli -t -f IN-USE,SSID,BSSID,SIGNAL,SECURITY device wifi list ifname {iface}")
    nets = []
    for line in out.splitlines():
        parts = (line.split(":", maxsplit=4) + ["", "", "", "", ""])[:5]
        inuse, ssid, bssid, signal, sec = parts
        if not ssid:
            continue
        nets.append({
            "ssid": ssid,
            "bssid": bssid or None,
            "signal": int(signal) if signal.isdigit() else None,
            "security": sec or None,
            "in_use": inuse == "*"
        })
    return nets

def wifi_connect(ssid: str, password: str, iface: str | None = None, bssid: str | None = None):
    """
    Verbindet mit SSID. Optional BSSID pinnen.
    Legt das Profil an oder aktualisiert es.
    """
    iface = iface or detect_wifi_iface()
    args = f'nmcli device wifi connect "{ssid}" password "{password}" ifname {iface}'
    if bssid:
        args += f" bssid {bssid}"
    run(args)
    return True

def wifi_forget(ssid: str):
    """
    Entfernt gespeichertes WLAN-Profil mit Namen = SSID.
    Ignoriert, falls nicht vorhanden.
    """
    try:
        run(f'nmcli connection delete "{ssid}"')
    except WifiError as e:
        msg = str(e).lower()
        if "unknown connection" in msg or "not found" in msg:
            return False
        raise
    return True
