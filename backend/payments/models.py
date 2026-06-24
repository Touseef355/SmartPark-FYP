import uuid
from django.db import models



class Payment(models.Model):
    STATUS_CHOICES = (
        ("initiated", "Initiated"),
        ("pending", "Pending"),
        ("success", "Success"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    )
    PAYMENT_TYPE_CHOICES = (
        ("online", "Online"),
        ("cash", "Cash"),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # String reference used to avoid circular import
    booking = models.OneToOneField(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name="payment"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, null=True, blank=True)
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        default="online"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="initiated"
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    currency = models.CharField(max_length=10, default="PKR")
    payment_reference = models.CharField(max_length=100, null=True, blank=True)
    refund_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    class Meta:
        db_table = "payments"
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['paid_at']),
        ]

    def __str__(self):
        return f"Payment {self.id} for Booking {self.booking.id}: {self.amount} ({self.status})"