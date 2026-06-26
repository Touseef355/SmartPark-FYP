import urllib.request
import json

data = json.dumps({
    "full_name": "Test Name",
    "email": "test@test.com",
    "phone_number": "03001234567",
    "query_type": "owner_registration",
    "message": "Testing",
    "proposed_site_name": "Test Site",
    "site_capacity": 50
}).encode("utf-8")

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/registration-query/',
    data=data,
    headers={'Content-Type': 'application/json'}
)

try:
    response = urllib.request.urlopen(req)
    print(response.read().decode())
except Exception as e:
    print(e)
    if hasattr(e, 'read'):
        print(e.read().decode())
