import logging
import os
import time
from threading import Thread, Lock

from flask import Flask, jsonify, request, abort

import api_caller
from worker import run


app = Flask(__name__)

_row_lock = Lock()
_rows_state = {}
_products_lock = Lock()
_products_cache = {"timestamp": 0.0, "data": None}
_cache_ttl = int(os.getenv("FRONTEND_API_CACHE_TTL", "30"))


def _load_row_metadata():
    """Populate row metadata so clients can display friendly names."""
    for idx in range(1, 13):
        row_id = str(idx)
        designation = f"Row {row_id}"
        data = None
        try:
            response = api_caller.get_product(row_id)
            data = response.json()
            designation = data.get("designation", designation)
        except Exception as exc:
            logging.debug("Unable to fetch designation for row %s: %s", row_id, exc)
        _rows_state[row_id] = {
            "designation": designation,
            "status": "idle",
            "message": "Ready",
            "product": data if isinstance(data, dict) else None,
        }


def _ensure_metadata():
    if not _rows_state:
        _load_row_metadata()


def _get_products(force_refresh: bool = False):
    now = time.time()
    with _products_lock:
        if (
            not force_refresh
            and _products_cache["data"] is not None
            and (now - _products_cache["timestamp"]) < _cache_ttl
        ):
            return _products_cache["data"]

    products = api_caller.get_valid_products()
    with _products_lock:
        _products_cache["timestamp"] = time.time()
        _products_cache["data"] = products
    return products


def _worker_run_wrapper(row_id: str):
    try:
        run(row_id)
        status = "idle"
        message = "Completed successfully"
    except Exception as exc:  # pragma: no cover - defensive logging
        logging.exception("Worker error while processing row %s: %s", row_id, exc)
        status = "error"
        message = str(exc)
    with _row_lock:
        _rows_state[row_id]["status"] = status
        _rows_state[row_id]["message"] = message


@app.before_request
def _restrict_to_local_requests():
    remote = request.remote_addr or ""
    if remote not in ("127.0.0.1", "::1"):
        abort(403)


@app.route("/rows", methods=["GET"])
def list_rows():
    _ensure_metadata()
    with _row_lock:
        return jsonify(_rows_state)


@app.route("/rows/<row_id>", methods=["POST"])
def process_row(row_id: str):
    _ensure_metadata()
    if row_id not in _rows_state:
        abort(404, description=f"Row {row_id} not found")
    with _row_lock:
        status = _rows_state[row_id]["status"]
        if status == "processing":
            abort(409, description=f"Row {row_id} is already processing")
        _rows_state[row_id]["status"] = "processing"
        _rows_state[row_id]["message"] = "Processing"
    Thread(target=_worker_run_wrapper, args=(row_id,), daemon=True).start()
    return jsonify({"row": row_id, "status": "processing"}), 202


@app.route("/products", methods=["GET"])
def products():
    refresh = request.args.get("refresh") == "1"
    try:
        data = _get_products(force_refresh=refresh)
    except Exception as exc:
        logging.exception("Unable to fetch products for API clients")
        abort(502, description=f"Product lookup failed: {exc}")
    return jsonify(data)


@app.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    rfid = payload.get("rfid")
    if not rfid:
        abort(400, description="Missing 'rfid'")
    try:
        user = api_caller.get_user_by_rfid(str(rfid))
    except Exception as exc:
        abort(502, description=f"Backend lookup failed: {exc}")
    return jsonify(user)


@app.route("/sales", methods=["POST"])
def create_sale():
    payload = request.get_json(silent=True) or {}
    member_id = payload.get("memberid")
    item_id = payload.get("itemid")
    amount = payload.get("amount", 1)
    if not member_id or not item_id:
        abort(400, description="Both 'memberid' and 'itemid' are required")
    try:
        amount = int(amount)
    except (TypeError, ValueError):
        abort(400, description="'amount' must be an integer")
    try:
        result = api_caller.set_new_sale(str(member_id), str(item_id), amount)
    except Exception as exc:
        abort(502, description=f"Sale creation failed: {exc}")
    return jsonify(result), 201


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    _ensure_metadata()
    app.run(host="127.0.0.1", port=5001, debug=False)
