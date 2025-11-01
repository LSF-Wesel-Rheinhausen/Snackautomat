import logging

from flask import Flask, request, jsonify
import worker
import flask
import api_caller, wifi_manager, read_nfc
import os

app = Flask(__name__, static_url_path='/static')
from dotenv import load_dotenv
load_dotenv()

@app.route('/Buy', methods=['POST'])
def run_worker():
    data = flask.request.get_json()
    row = data.get('row')
    memberid = data.get('memberid')
    try:
        if worker.run(row) is True: # Call the worker function
            api_caller.set_new_sale(memberid=memberid, itemid=row, amount=1)
            return {"message": f"{row} processed successfully"}, 200
        else:
            return {"error": f"Failed to process {row}, internal error turning row. View local logs for more information"}, 500
    except ConnectionError as ce:
        print(f"Connection Error processing {row}: {ce}")
        return {"error": "Connection error occurred"}, 500
    except TimeoutError as te:
        print(f"Timeout Error processing {row}: {te}")
        return {"error": "Timeout error occurred"}, 500
    except ValueError as ve:
        print(f"Value Error processing {row}: {ve}")
        return {"error": "Invalid value provided"}, 500
    except Exception as e:
        print(f"Unknown Error processing {row}: {e}")
        return {"error": str(e)}, 500

@app.route('/get_Product_List', methods=['GET'])
def get_products():
    try:
        products = api_caller.get_valid_products()
        return products, 200
    except Exception as e:
        logging.debug(f"Error getting products: {e}")
        products = {}
        return products, 500

@app.route('/get_User_Info', methods=['GET'])
def login():
    nfc_id = read_nfc.read_uid()
    if nfc_id:
        rfid = jsonify(nfc_id).get_json()
        logging.debug(f"Read NFC tag with RFID: {rfid}")
        try:
            user_info = api_caller.get_user_by_rfid(rfid)
            return user_info, 200
        except Exception as e:
            logging.debug(f"Error getting user info for RFID {rfid}: {e}")
            return {f'error": User  for RFID {rfid} not found'}, 500
    else:
        return jsonify({"error": "Failed to read NFC tag"}), 500


@app.route('/health', methods=['GET'])
def health_check():
    if os.getenv('FLASK_ENV') not in ['production', 'development']:
        return {"status": "error", "message": "FLASK_ENV not set correctly"}, 500
    if api_caller.test_connection() is False:
        return {"status": "error", "message": "Cannot connect to Broker"}, 500
    return {"status": "ok"}, 200


@app.route("/wifi/list", methods=['GET'])
def api_wifi_list():
    refresh = request.args.get("refresh") in {"1", "true", "yes"}
    min_signal = request.args.get("min_signal", type=int)
    limit = request.args.get("limit", type=int)

    try:
        networks = wifi_manager.list_wifi()
    except ConnectionError as e:
        os.abort(503, description=str(e))

    if refresh:
        # aktiven Rescan triggern und erneut lesen
        from wifi_manager import run
        try:
            iface = wifi_manager.detect_wifi_iface()
            run(f"nmcli device wifi rescan ifname {iface}")
            networks = wifi_manager.detect_wifi_iface(iface)
        except Exception:
            pass

    if min_signal is not None:
        networks = [n for n in networks if n["signal"] is not None and n["signal"] >= min_signal]

    if limit is not None and limit > 0:
        networks = networks[:limit]

    return jsonify({"count": len(networks), "results": networks})


@app.route("/wifi/connect", methods=['POST'])
def api_wifi_connect():
    """
    Body JSON:
    {
      "ssid": "MySSID",
      "password": "secret",
      "bssid": "AA:BB:CC:DD:EE:FF",   # optional
      "iface": "wlan0",               # optional, sonst Auto
      "hidden": false                 # optional
    }
    """
    data = request.get_json(silent=True) or {}
    ssid = data.get("ssid")
    password = data.get("password")
    bssid = data.get("bssid")
    iface = data.get("iface")
    hidden = bool(data.get("hidden", False))

    if not isinstance(ssid, str) or not ssid.strip():
        os.abort(400, description="ssid fehlt oder ist leer")
    if not isinstance(password, str) or not password:
        os.abort(400, description="password fehlt oder ist leer")
    if bssid is not None and not isinstance(bssid, str):
        os.abort(400, description="bssid muss String sein")
    if iface is not None and not isinstance(iface, str):
        os.abort(400, description="iface muss String sein")

    try:
        used_iface = wifi_manager.wifi_connect(ssid=ssid.strip(), password=password, iface=iface, bssid=bssid, hidden=hidden)
    except ConnectionError as e:
        os.abort(502, description=str(e))

    return jsonify({
        "status": "connected",
        "ssid": ssid,
        "iface": used_iface,
        "bssid": bssid,
        "hidden": hidden
    }), 201

@app.route("/OTA", methods=['GET'])
def ota_update():
    try:
        #TODO: Implement OTA update logic
        if worker is True:
            return {"message": "OTA update successful"}, 200
        else:
            return {"message": "OTA update failed"}, 500
    except Exception as e:
        logging.debug(f"Error during OTA update: {e}")
        return {"error": str(e)}, 500


if __name__ == '__main__':
    if os.getenv('FLASK_ENV') == 'production':
        app.config['DEBUG'] = False
        logging.basicConfig(level=logging.INFO)
    elif os.getenv('FLASK_ENV') == 'development':
        app.config['DEBUG'] = True
        logging.basicConfig(level=logging.DEBUG)
    else:
        raise AttributeError("FLASK_ENV environment variable not set to 'production' or 'development'")
    app.run(debug=True, host="0.0.0.0", port=8124)