

from flask import Flask, render_template, request, redirect, url_for, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from flask_httpauth import HTTPBasicAuth
from flask_talisman import Talisman
import logging
import vf_data
from dotenv import load_dotenv
load_dotenv()
app = Flask(__name__, static_url_path='/static')
Talisman(app)

@app.route('/getAllProducts', methods=['GET'])
def get_all_products():
    return vf_data.get_shop_items()

@app.route('/getFUProducts', methods=['GET'])
def get_fu_products():
    return vf_data.get_fu_products()

@app.route('/getValidFUProducts', methods=['GET'])
def get_valid_f_products():
    return vf_data.get_valid_fu_products()


@app.route('/test', methods=['POST'])
def test():
    return "Hello World"

@app.route('/testBuy', methods=['GET'])
def test_buy():
    buyer = {
        "memberid": 317179,
    }
    valid_items = vf_data.get_valid_fu_products()  # Fetches valid items for today's date based on your method

# Fetch the first valid item (if available)
    if valid_items:
        valid_item = next(iter(valid_items.values()))
    else:
        valid_item = None  # No valid items found


    response = vf_data.set_new_sale(buyer,1,valid_item)
    return response

@app.route('/getUserInfo', methods=['POST'])
def get_user_info():
    data = request.get_json()
    memberid = data.get('rfid_id')
    return vf_data.get_user_info(memberid)

@app.route('/getSpecificProduct', methods=['POST'])
def getProduct():
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
