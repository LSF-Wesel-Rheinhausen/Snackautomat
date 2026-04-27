import tempfile
from flask import Flask, request, Response
from flask_jwt_extended import JWTManager, jwt_required
from flask_talisman import Talisman
import logging
from werkzeug.serving import make_ssl_devcert
import vf_data
import os
app = Flask(__name__, static_url_path='/static')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False
jwt = JWTManager(app)
Talisman(app)

@app.route('/getAllProducts', methods=['GET'])
@jwt_required()
def get_all_products():
    """Return all products from the upstream backend."""
    return vf_data.get_shop_items()

@app.route('/getFUProducts', methods=['GET'])
@jwt_required()
def get_fu_products():
    """Return only snack machine products."""
    return vf_data.get_fu_products()

@app.route('/getValidFUProducts', methods=['GET'])
@jwt_required()
def get_valid_f_products():
    """Return snack machine products valid for the current date."""
    return vf_data.get_valid_fu_products()


@app.route('/test', methods=['GET'])
@jwt_required()
def test():
    """Return static response used by local health checks."""
    return "Hello World"

@app.route('/Buy', methods=['POST'])
@jwt_required()
def test_buy():
    """Validate and register a product purchase."""
    data = request.get_json(silent=True) or {}
    memberid = data.get('memberid')
    itemid = data.get('itemid')
    amount = data.get('amount')
    if memberid is None or itemid is None or amount is None:
        return {"message": "memberid, itemid und amount sind erforderlich"}, 400
    buyer = {
        "memberid": memberid,
    }
    valid_items = vf_data.get_valid_fu_products()  # Fetches valid items for today's date based on your method
    # Check if the requested item is in the list of valid items
    valid_item = valid_items.get(itemid)
    if valid_item:
        item_with_id = {**valid_item, "id": itemid}
        response = vf_data.process_sale(buyer, amount, item_with_id)
        if response == vf_data.CON_ERROR:
            return {"message": "Sale booking failed"}, 502
        return response
    else:
        return {"message": "Invalid item"}, 400


@app.route('/admin/sales-backend-mode', methods=['GET'])
@jwt_required()
def get_sales_backend_mode():
    """Return currently active sales backend mode."""
    return {"mode": vf_data.get_sales_backend_mode()}, 200


@app.route('/admin/sales-backend-mode', methods=['PUT'])
@jwt_required()
def set_sales_backend_mode():
    """Update sales backend mode ('vereinsflieger' or 'local_db')."""
    data = request.get_json(silent=True) or {}
    mode = data.get("mode")
    if not isinstance(mode, str):
        return {"message": "mode fehlt oder ist ungültig"}, 400
    try:
        normalized_mode = vf_data.set_sales_backend_mode(mode)
    except ValueError as exc:
        return {"message": str(exc)}, 400
    return {"mode": normalized_mode}, 200


@app.route('/export/orders', methods=['GET'])
@jwt_required()
def export_orders():
    """Export machine order history from local database as JSON or CSV."""
    output_format = request.args.get("format", default="json", type=str).lower()
    from_date = request.args.get("from", type=str)
    to_date = request.args.get("to", type=str)
    memberid = request.args.get("memberid", type=str)

    try:
        content, mimetype = vf_data.export_orders(
            output_format=output_format,
            from_date=from_date,
            to_date=to_date,
            memberid=memberid,
        )
    except ValueError as exc:
        return {"message": str(exc)}, 400

    if mimetype == "text/csv":
        return Response(
            content,
            mimetype=mimetype,
            headers={"Content-Disposition": "attachment; filename=orders_export.csv"},
        )
    return Response(content, mimetype=mimetype)

@app.route('/getUserInfo', methods=['POST'])
@jwt_required()
def get_user_info():
    """Return local user metadata for the provided RFID."""
    data = request.get_json(silent=True) or {}
    memberid = data.get('rfid_id')
    if not memberid:
        return {"message": "rfid_id fehlt"}, 400
    return vf_data.get_user_info(memberid)

@app.route('/getSpecificProduct', methods=['POST'])
@jwt_required()
def get_product():
    """Return the first product matching the requested vending row marker."""
    data = request.get_json(silent=True) or {}
    row = data.get('row')
    if row is None:
        return {"message": "row fehlt"}, 400
    valid_products = vf_data.get_valid_fu_products()
    for product_id, product_details in valid_products.items():
        if f'[{row}]' in product_details.get('designation', ''):
            return product_details
    return "False"

def ensure_ssl_certificates(cert_filename='data/cert.pem', key_filename='data/key.pem'):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cert_path = os.path.join(base_dir, cert_filename)
    key_path = os.path.join(base_dir, key_filename)
    if os.path.exists(cert_path) and os.path.exists(key_path):
        return cert_path, key_path
    for stale_file in (cert_path, key_path):
        if os.path.exists(stale_file):
            os.remove(stale_file)
    with tempfile.TemporaryDirectory() as tmp_dir:
        temp_base = os.path.join(tmp_dir, 'devcert')
        try:
            generated_cert, generated_key = make_ssl_devcert(temp_base)
        except TypeError as exc:
            logging.warning(
                "Unable to generate SSL certificates automatically: %s. "
                "Install the 'cryptography' package to enable auto-generation.",
                exc,
            )
            return None, None
        os.replace(generated_cert, cert_path)
        os.replace(generated_key, key_path)
    logging.debug("Generated new self-signed SSL certificate at %s and key at %s", cert_path, key_path)
    return cert_path, key_path

if __name__ == '__main__':
    if os.getenv("FLASK_ENV") == "development":
        logging.basicConfig(level=logging.DEBUG)
        app.run(debug=True, host="0.0.0.0", port=8124, ssl_context=("data/cert.pem","data/key.pem"))
    else:
        logging.basicConfig(level=logging.INFO)
        app.run(debug=False, host="0.0.0.0", port=8124, ssl_context=("data/cert.pem","data/key.pem"))
