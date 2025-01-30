import datetime
import os
import jwt
import requests

def get_jwt_token(payload) -> str:
    key = os.getenv("JWT_SECRET_KEY")
    token = jwt.encode(payload, key, algorithm="HS256")
    return token

def get_user_by_rfid(rfid: str) -> dict:
    payload = {
        "sub": "get_user_by_rfid",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.get(f"{os.getenv('backendip')}/getUserInfo/{rfid}", headers=headers)
    return response.json()

def get_valid_products() -> dict:
    payload = {
        "sub": "get_valid_products",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.get(f"{os.getenv('backendip')}/getValidFUProducts", headers=headers)
    return response.json()

def get_product(row: str) -> dict:
    payload = {
        "sub": "get_product",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(f"{os.getenv('backendip')}/getSpecificProduct", json={"row": row}, headers=headers)
    return response.json()

def set_new_sale(memberid: str, itemid: str, amount: int) -> dict:
    payload = {
        "sub": "set_new_sale",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(f"{os.getenv('backendip')}/Buy", json={"memberid": memberid, "itemid": itemid, "amount": amount}, headers=headers)
    return response.json()