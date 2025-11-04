import tempfile
from flask import Flask, request
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
    return vf_data.get_shop_items()

@app.route('/getFUProducts', methods=['GET'])
@jwt_required()
def get_fu_products():
    return vf_data.get_fu_products()

@app.route('/getValidFUProducts', methods=['GET'])
@jwt_required()
def get_valid_f_products():
    return vf_data.get_valid_fu_products()


@app.route('/test', methods=['GET'])
@jwt_required()
def test():
    return "Hello World"

@app.route('/Buy', methods=['POST'])
@jwt_required()
def test_buy():
    data = request.get_json()
    memberid = data.get('memberid')
    itemid = data.get('itemid')
    amount = data.get('amount')
    buyer = {
        "memberid": memberid,
    }
    valid_items = vf_data.get_valid_fu_products()  # Fetches valid items for today's date based on your method
    # Check if the requested item is in the list of valid items
    valid_item = valid_items.get(itemid)
    if valid_item:
        response = vf_data.set_new_sale(buyer, amount, valid_item)
        return response
    else:
        return {"message": "Invalid item"}, 400

@app.route('/getUserInfo', methods=['POST'])
@jwt_required()
def get_user_info():
    data = request.get_json()
    memberid = data.get('rfid_id')
    return vf_data.get_user_info(memberid)

@app.route('/getSpecificProduct', methods=['POST'])
@jwt_required()
def get_product():
    data = request.get_json()
    row = data.get('row')
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
    logging.basicConfig(level=logging.DEBUG)
    logging.info(os.getenv('JWT_SECRET_KEY'))
    #app.run(debug=True, host="0.0.0.0", port=8123)
    app.run(debug=True, host="0.0.0.0", port=8124, ssl_context=(ensure_ssl_certificates("data/cert.pem","data/key.pem")))



