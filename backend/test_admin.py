import urllib.request
import json
import os
from datetime import datetime

# We need a token first
# Admin is 'admin@test.com' 'admin123' or similar?
# Let's hit the DB to generate token or just test login
login_data = json.dumps({
    "email": "admin@smartpark.com",
    "password": "admin"
}).encode("utf-8")

req_login = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/login/',
    data=login_data,
    headers={'Content-Type': 'application/json'}
)

try:
    res = urllib.request.urlopen(req_login)
    token = json.loads(res.read().decode())['tokens']['access']
    print("Login OK")
    
    # Now test queries endpoint
    req_queries = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/admin/registration-queries/',
        headers={'Authorization': f'Bearer {token}'}
    )
    res_queries = urllib.request.urlopen(req_queries)
    print("Queries:", res_queries.read().decode())
    
    # Test notification count endpoint
    req_count = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/admin/notifications/count/',
        headers={'Authorization': f'Bearer {token}'}
    )
    res_count = urllib.request.urlopen(req_count)
    print("Count:", res_count.read().decode())

except Exception as e:
    print(e)
    if hasattr(e, 'read'):
        print(e.read().decode())
