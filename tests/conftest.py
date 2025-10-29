from __future__ import annotations

import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


if "jwt" not in sys.modules:
    jwt_module = types.SimpleNamespace()

    def _encode(payload, key, algorithm=None):
        return "stub-token"

    jwt_module.encode = _encode
    sys.modules["jwt"] = jwt_module
