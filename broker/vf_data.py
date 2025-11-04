import json
import time
from datetime import datetime
import os

import requests
import hashlib
import logging

CACHE_FILE = "data/shop_items_cache.json"
CACHE_TTL = 86400  # Cache validity in seconds
CON_ERROR = "Connection error"

def get_shop_items_cached():
    # Check if cache file exists and is still valid
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            cached_data = json.load(f)
            if time.time() - cached_data["timestamp"] < CACHE_TTL:
                logging.info("Returning cached shop items from file.")
                return cached_data["data"]

    # Fetch fresh data and write to cache file
    logging.info("Fetching fresh shop items and caching them.")
    try:
        shop_items = get_shop_items()
        with open(CACHE_FILE, "w") as f:
            json.dump({"timestamp": time.time(), "data": shop_items}, f)
        return shop_items
    except ConnectionError:
        logging.error("Error fetching shop items. Returning cached data if available.")
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r") as f:
                return json.load(f)["data"]
        return CON_ERROR

# Get the data from the API
def get_access_token():
    """
        This function is used to get the access token from the API.

        It sends a GET request to the API endpoint for access tokens.
        The function returns the access token if the request is successful.

        Raises:
        ConnectionRefusedError: If the server returns a 401 status code, indicating unauthorized access.
        ConnectionError: If the server returns a 500 or greater status code, indicating an internal server error.
        ConnectionError: If the server returns any other status code.

        Returns:
        str: The access token if the request is successful.
        """
    url = _api_url + "interface/rest/auth/accesstoken"
    response = requests.get(url)
    data = response.json()
    return data.get("accesstoken")


_api_token = os.environ.get("API_TOKEN")
_api_username = os.environ.get("API_USERNAME")
_api_password = os.environ.get("API_PASSWORD")
_api_url = os.environ.get("API_URL")
_api_cid = os.environ.get("API_CID")


def test():
    print(_api_token)


def login():
    """
        This function is used to log in a user using the API.
        WARNING: The password is hashed using MD5 before being sent.
        WARNING: The password is stored in plain text in the config file.
        WARNING: 2FA is implemented but not working with a functional user.

        It sends a POST request to the API with the username, password, and API token.
        The password is hashed using MD5 before being sent.
        The function returns the access token if the login is successful.

        Raises:
        ConnectionRefusedError: If the server returns a 401 status code, indicating unauthorized access.
        ConnectionError: If the server returns a 500 or greater status code, indicating an internal server error.
        ConnectionError: If the server returns any other status code.

        Returns:
        str: The access token if the login is successful.
        """
    logging.info('logging user ' + _api_username + ' in...')
    # post to api with username and password and api_token
    url = _api_url + "interface/rest/auth/signin"
    #auth_secret = input('Enter auth_secret: ')
    accesstoken = get_access_token()
    password = hashlib.md5(_api_password.encode()).hexdigest()
    payload = {
        'accesstoken': accesstoken,
        "username": _api_username,
        "password": password,
        "appkey": _api_token,
        "cid": _api_cid,
        #"auth_secret": auth_secret
    }
    logging.debug('Password: ')
    logging.debug(password)
    logging.debug('Accesstoken: ' + str(accesstoken))
    logging.debug(json.dumps(payload, indent=4))
    response = requests.post(url, data=json.dumps(payload))
    logging.debug(response.text)
    if response.status_code == 200:
        return accesstoken
    elif response.status_code == 401:
        raise ConnectionRefusedError("Server returned 401, UNAUTHORIZED")
    elif response.status_code >= 500:
        raise ConnectionError("Server returned 500 or greater, INTERNAL SERVER ERROR: " + str(response.status_code))
    else:
        raise ConnectionError("Server returned " + str(response.status_code))


def get_vfid(vname, nname):
    """
        This function is used to get the member ID of a user by their first and last name.
        IMPORTANT: THIS FUNCTION REQUIRES THE RIGHT "Mitgliederdaten bearbeiten"/"Edit member data"

        Parameters:
        vname (str): The first name of the user.
        nname (str): The last name of the user.

        Returns:
        int: The member ID of the user if found, otherwise 1.
        """
    logging.info('getting vfid for ' + vname + ' ' + nname + '...')
    try:
        accesstoken = login()
        url = _api_url + "interface/rest/user/list"
        payload = {
            'accesstoken': accesstoken,
        }
        response = requests.post(url, data=json.dumps(payload))
        logging.debug(json.dumps(response.json(), indent=4))
        if response.status_code != 200:
            raise ConnectionError("Server returned " + str(response.status_code))
        for user in response.json().get("users"):
            if user.get("firstname") == vname and user.get("lastname") == nname:
                return user.get("memberid")
    except ConnectionError:
        logging.error("Error while getting vfid returning internal ID")
        return "Connection error"

def get_shop_items():
    """
    Retrieve the list of shop items from the server.

    This function sends a POST request to a specified API endpoint to fetch the
    list of shop items using an access token for authentication. The shop items
    are returned as JSON data if the request is successful.

    Returns:
        dict: JSON response from the server containing shop item details. The
        response is structured as follows:
        {
            "item_id": {
                "articleid": str,          # Identifier for the article
                "designation": str,        # Name or description of the article
                "prices": [                # List of price objects
                    {
                        "salestax": str,   # The sales tax percentage
                        "unitprice": str,  # The price per unit
                        "validfrom": str,  # Start date of the price validity
                        "validto": str     # End date of the price validity
                    }
                ],
                "unittype": str            # The unit type of the article (e.g., "Liter" or "Stück")
            },
            ...
        }
        str: Returns "Connection error" if there is an issue connecting to the server.

    Raises:
        ConnectionError: If the server responds with a status code other than 200.

    Example Usage:
        >>> items = get_shop_items()
        >>> if items != "Connection error":
        ...     for item in items['items']:
        ...         print(item['name'])
    """
    url = _api_url+ "interface/rest/articles/list"
    logging.info('getting shop_items...')
    try:
        accesstoken = login()
        payload = {
            'accesstoken': accesstoken,
        }
        response = requests.post(url, data=json.dumps(payload))
        if response.status_code != 200:
            raise ConnectionError("Server returned " + str(response.status_code))
        else:
            return response.json()
    except ConnectionError:
        logging.error("Error while getting shop_items")
        return CON_ERROR

def get_fu_products():
    articles = get_shop_items_cached()
    prefix="Snackautomat Reihe "
    filtered_articles = {
        item_id: details
        for item_id, details in articles.items()
        if isinstance(details, dict) and details.get("articleid", "").startswith(prefix)
    }
    converted_articles = json.loads(json.dumps(filtered_articles, ensure_ascii=False))
    return converted_articles

def get_valid_fu_products():
    """
     Filter shop items by their validity date range.

     This function checks all shop items in the given dictionary and filters
     those that are valid for today's date based on their `validfrom` and `validto`
     fields within `prices`.

     Args:
         articles (dict): Dictionary containing shop items. Each key is an item ID,
                          and the value contains the article's details.

     Returns:
         dict: A new dictionary containing only the items that are valid today
               (i.e., within the date range specified in `validfrom` and `validto`).

     Example Usage:
         >>> from datetime import datetime
         >>> articles = {
         ...     "31869": {
         ...         "articleid": "211",
         ...         "designation": "Fliegerlager Super Tanken",
         ...         "prices": [
         ...             {"validfrom": "2023-07-01", "validto": "2023-07-30"}
         ...         ],
         ...         "unittype": "Liter",
         ...     },
         ...     "34722": {
         ...         "articleid": "FU_Test1",
         ...         "designation": "Test für API Integrationen",
         ...         "prices": [
         ...             {"validfrom": "2024-04-01", "validto": "2024-10-01"}
         ...         ],
         ...         "unittype": "Stück",
         ...     },
         ...     "36641": {
         ...         "articleid": "FU_Test2",
         ...         "designation": "Super Plus",
         ...         "prices": [
         ...             {"validfrom": "2023-01-01", "validto": "9999-12-31"}
         ...         ],
         ...         "unittype": "Liter",
         ...     },
         ... }
         >>> valid_articles = getValidFUProducts(articles)
         >>> print(valid_articles)
     """
    today = datetime.now().date()
    articles = get_fu_products()
    filtered_articles = {}

    for item_id, details in articles.items():
        if not isinstance(details, dict):  # Skip non-dictionary entries
            continue

        valid_prices = []

        for price in details.get("prices", []):
            try:
                # Parse dates
                valid_from = datetime.strptime(str(price["validfrom"]), "%Y-%m-%d").date()
                valid_to = datetime.strptime(price["validto"], "%Y-%m-%d").date()

                # Check if today is within the range
                if valid_from <= today <= valid_to:
                    valid_prices.append(price)
            except (KeyError, ValueError):
                # Skip entries with invalid or incomplete dates
                continue

        # If any valid prices are found, add the article to the result
        if valid_prices:
            filtered_articles[item_id] = {
                **details,
                "prices": valid_prices,  # Include only valid prices
            }

    return filtered_articles


def set_new_sale(buyer, amount, item):
    url = _api_url + "interface/rest/sale/add"
    logging.info('setting shop buy...')
    try:
        accesstoken = login()
        payload = {
            'accesstoken': accesstoken,
            'articleid': item["articleid"],
            'bookingdate': datetime.now().date().isoformat(),
            'amount': amount,
            'memberid': int(buyer["memberid"]),
            'comment': "Automatisch gebucht",
        }
        logging.debug(json.dumps(payload, indent=4))
        response = requests.post(url, data=json.dumps(payload))
        if response.status_code != 200:
            raise ConnectionError("Server returned " + str(response.status_code))
        else:
            return response.json()
    except ConnectionError:
        logging.error("Error while getting shop_items")
        return CON_ERROR


def get_user_info(keyname):
    with open('data/token.json', 'r') as file:
        users = json.load(file)
    for user in users:
        for key in user.get('keymanagement', []):
            if key.get('keyname') == keyname:
                return user

    return {"message": "User not found"}
