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
REQUEST_TIMEOUT_SECONDS = 10

def get_jwt_token(payload) -> str:
    """Create a signed JWT used for broker authentication."""
    key = os.environ.get('JWT_SECRET_KEY')
    if not isinstance(key, str):
        raise TypeError("JWT_SECRET_KEY environment variable must be a string")
    key = str(key)  # Ensure the key is a string
    token = jwt.encode(payload, key, algorithm="HS256")
    return token

def get_user_by_rfid(rfid: str) -> dict:
    """Fetch user information associated with an RFID token."""
    payload = {
        "sub": "get_user_by_rfid",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(
        f"{os.environ.get('backendip')}/getUserInfo",
        json={"rfid_id": rfid},
        headers=headers,
        verify=not ignore_self_signed_cert,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.json()

def get_valid_products() -> dict:
    """Fetch products that are currently valid for sale."""
    payload = {
        "sub": "get_valid_products",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.get(
        f"{os.environ.get('backendip')}/getValidFUProducts",
        headers=headers,
        verify=not ignore_self_signed_cert,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.json()

def get_product(row: str):
    """Fetch product metadata for one vending row."""
    payload = {
        "sub": "get_product",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(
        f"{os.environ.get('backendip')}/getSpecificProduct",
        json={"row": row},
        headers=headers,
        verify=not ignore_self_signed_cert,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response

def set_new_sale(memberid: str, itemid: str, amount: int) -> dict:
    """Create a sale in broker backend for the selected product."""
    payload = {
        "sub": "set_new_sale",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.post(
        f"{os.environ.get('backendip')}/Buy",
        json={"memberid": memberid, "itemid": itemid, "amount": amount},
        headers=headers,
        verify=not ignore_self_signed_cert,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.json()


def get_sales_backend_mode() -> dict:
    """Fetch active sales backend mode from broker admin endpoint."""
    payload = {
        "sub": "get_sales_backend_mode",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.get(
        f"{os.environ.get('backendip')}/admin/sales-backend-mode",
        headers=headers,
        verify=not ignore_self_signed_cert,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.json()


def set_sales_backend_mode(mode: str) -> dict:
    """Set sales backend mode on broker admin endpoint."""
    payload = {
        "sub": "set_sales_backend_mode",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.put(
        f"{os.environ.get('backendip')}/admin/sales-backend-mode",
        json={"mode": mode},
        headers=headers,
        verify=not ignore_self_signed_cert,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.json()


def export_orders(output_format: str = "json", from_date: str | None = None, to_date: str | None = None, memberid: str | None = None):
    """Request order export from broker and return raw response object."""
    payload = {
        "sub": "export_orders",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    params = {"format": output_format}
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date
    if memberid:
        params["memberid"] = memberid
    response = requests.get(
        f"{os.environ.get('backendip')}/export/orders",
        params=params,
        headers=headers,
        verify=not ignore_self_signed_cert,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response


def test_connection():
    """Test whether the broker endpoint is reachable and authenticated."""
    payload = {
        "sub": "test_connection",
        "name": "Frontend",
        "iat": datetime.datetime.utcnow()
    }
    headers = {"Authorization": f"Bearer {get_jwt_token(payload)}"}
    response = requests.get(
        f"{os.environ.get('backendip')}/test",
        headers=headers,
        verify=not ignore_self_signed_cert,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.text == "Hello World"
