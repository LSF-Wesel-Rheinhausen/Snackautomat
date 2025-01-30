import datetime
import os
import jwt
import requests
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Check if self-signed certificates should be ignored
ignore_self_signed_cert = os.getenv('IGNORE_SELF_SIGNED_CERT', 'false').lower() == 'true'

def get_jwt_token(payload) -> str:
    key = os.environ.get('JWT_SECRET_KEY')
    if not isinstance(key, str):
        raise TypeError("JWT_SECRET_KEY environment variable must be a string")
    key = str(key)  # Ensure the key is a string
    token = jwt.encode(payload, key, algorithm="HS256")
    return token

def get_user_by_rfid(rfid: str) -> dict:
    payload = {
        "sub": "get_user_by_rfid",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(f"{os.environ.get('backendip')}/getUserInfo", json={"rfid_id": rfid}, headers=headers, verify=not ignore_self_signed_cert)
    response.raise_for_status()
    return response.json()

def get_valid_products() -> dict:
    payload = {
        "sub": "get_valid_products",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.get(f"{os.environ.get('backendip')}/getValidFUProducts", headers=headers, verify=not ignore_self_signed_cert)
    response.raise_for_status()
    return response.json()

def get_product(row: str):
    payload = {
        "sub": "get_product",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(f"{os.environ.get('backendip')}/getSpecificProduct", json={"row": row}, headers=headers, verify=not ignore_self_signed_cert)
    response.raise_for_status()
    return response

def set_new_sale(memberid: str, itemid: str, amount: int) -> dict:
    payload = {
        "sub": "set_new_sale",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(f"{os.environ.get('backendip')}/Buy", json={"memberid": memberid, "itemid": itemid, "amount": amount}, headers=headers, verify=not ignore_self_signed_cert)
    response.raise_for_status()
    return response.json()