import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sps_backend.settings')
django.setup()

from accounts.models import User
from parking.models import ParkingSite
from django.db import transaction
import traceback

def test_insert():
    try:
        with transaction.atomic():
            new_user = User.objects.create_user(
                email="test_onboard@test.com",
                full_name="Test Onboard",
                phone_number="03001234568",
                password="password",
                role="parking_owner",
            )
            print("User created with ID:", new_user.id)
            
            site = ParkingSite.objects.create(
                owner=new_user,
                name="Test Site",
                location="Location",
                capacity=20,
            )
            print("Site created with ID:", site.id)
    except Exception as e:
        print("Error:")
        traceback.print_exc()

if __name__ == '__main__':
    test_insert()
