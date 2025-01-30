import datetime
import os
import jwt
import requests
from cachetools import TTLCache, cached
from cachetools.keys import hashkey

# Define a cache with a TTL of 5 minutes (300 seconds)
cache = TTLCache(maxsize=9999, ttl=300)

def get_jwt_token(payload) -> str:
    key = os.getenv("JWT_SECRET_KEY")
    token = jwt.encode(payload, key, algorithm="HS256")
    return token

def cache_with_fallback(func):
    def wrapper(*args, **kwargs):
        key = hashkey(*args, **kwargs)
        try:
            # Try to get the result from the cache
            return cache[key]
        except KeyError:
            # If the result is not in the cache or expired, call the function
            result = func(*args, **kwargs)
            cache[key] = result
            return result
        except requests.RequestException:
            # If there is a connection error, return the expired cache if available
            if key in cache:
                return cache[key]
            else:
                raise
    return wrapper

@cache_with_fallback
def get_user_by_rfid(rfid: str) -> dict:
    payload = {
        "sub": "get_user_by_rfid",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.get(f"{os.getenv('backendip')}/getUserInfo/{rfid}", headers=headers)
    response.raise_for_status()
    return response.json()

@cache_with_fallback
def get_valid_products() -> dict:
    payload = {
        "sub": "get_valid_products",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.get(f"{os.getenv('backendip')}/getValidFUProducts", headers=headers)
    response.raise_for_status()
    return response.json()

@cache_with_fallback
def get_product(row: str) -> dict:
    payload = {
        "sub": "get_product",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(f"{os.getenv('backendip')}/getSpecificProduct", json={"row": row}, headers=headers)
    response.raise_for_status()
    return response.json()

@cache_with_fallback
def set_new_sale(memberid: str, itemid: str, amount: int) -> dict:
    payload = {
        "sub": "set_new_sale",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(f"{os.getenv('backendip')}/Buy", json={"memberid": memberid, "itemid": itemid, "amount": amount}, headers=headers)
    response.raise_for_status()
    return response.json()