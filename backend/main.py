

from flask import Flask, render_template, request, redirect, url_for, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from flask_httpauth import HTTPBasicAuth
from flask_jwt_extended import JWTManager, jwt_required, create_access_token
from flask_talisman import Talisman
import logging
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


@app.route('/test', methods=['POST'])
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
        return "No product found with designation containing {1}"

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True, host="0.0.0.0", port=8123)
