import uuid
import random
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, full_name, phone_number=None, password=None, role="user"):
        if not email:
            raise ValueError("Email is required")
        if not phone_number:
            raise ValueError("Phone number is required")
        email = self.normalize_email(email)
        user = self.model(
            id=uuid.uuid4(),
            email=email,
            full_name=full_name,
            phone_number=phone_number,
            role=role
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password, phone_number=None):
        if not phone_number:
            phone_number = input("Enter phone number for superuser: ")
        user = self.create_user(
            email=email,
            full_name=full_name,
            phone_number=phone_number,
            password=password,
            role="admin"
        )
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("parking_owner", "Parking Owner"),
        ("cashier", "Cashier"),
        ("user", "User"),
        ("entry_cashier",  "Entry Cashier"),  
        ("exit_cashier",   "Exit Cashier"),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")
    address = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_approved = models.BooleanField(
        default=True,
        help_text=(
            "For parking_owner accounts: False = pending admin approval. "
            "True for all other roles (auto-approved on register)."
        ),
    )
    site = models.ForeignKey(
        'parking.ParkingSite',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cashiers"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    profile_photo = models.ImageField(null=True, blank=True, upload_to="profile_photos/")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email
    
@receiver(pre_delete,sender=User)
def free_slot_on_account_delete(sender,instance,**kwargs):
    from bookings.models import Booking
    active_booking=Booking.objects.filter(user=instance,status="active")

    for booking in active_booking:
        slot=booking.parking_slot
        slot.is_occupied=False
        slot.save()
        