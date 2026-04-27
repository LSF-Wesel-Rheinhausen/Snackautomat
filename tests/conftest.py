import importlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BROKER_DIR = ROOT / "broker"
LOCAL_BACKEND_DIR = ROOT / "local" / "backend"

for path in (ROOT, BROKER_DIR, LOCAL_BACKEND_DIR):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)


def reload_module(name):
    sys.modules.pop(name, None)
    return importlib.import_module(name)
