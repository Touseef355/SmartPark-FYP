import uuid
from django.db import models
from django.conf import settings


class Booking(models.Model):
    STATUS_CHOICES = (
        ("active", "Active"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )
    PAYMENT_STATUS = (
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="bookings"
    )
    parking_slot = models.ForeignKey(
        'parking.ParkingSlot',  # string reference
        on_delete=models.CASCADE, related_name="bookings"
    )
    vehicle = models.ForeignKey(
        'parking.Vehicle',  # string reference
        on_delete=models.CASCADE, related_name="bookings"
    )
    entry_time = models.DateTimeField()
    exit_time = models.DateTimeField(null=True, blank=True)
    extended_exit_time = models.DateTimeField(null=True, blank=True)
    extension_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default="pending")
    PAYMENT_METHOD_CHOICES = (
        ("cash", "Cash"),
        ("online", "Online"),
    )
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES, 
        null=True, blank=True
    )
    overstay_grace = models.BooleanField(default=True)
    estimated_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bookings"
        indexes = [models.Index(fields=["entry_time"])]

    @property
    def duration(self):
        if self.exit_time:
            return self.exit_time - self.entry_time
        return None
    @property
    def actual_exit_time(self):
        if self.extended_exit_time:
            return self.extended_exit_time  # Extended time use here
        return self.exit_time               # Normal exit time


    def __str__(self):
        return f"{self.vehicle.name} ({self.vehicle.plate_number})"