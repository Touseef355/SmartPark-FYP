from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated 
from django.utils import timezone
from django.db import transaction
from .models import Payment
from .serializers import PaymentSerializer
from bookings.models import Booking


class PaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(booking__user=request.user)
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        with transaction.atomic():
            serializer = PaymentSerializer(data=request.data)  
            if serializer.is_valid():
                payment = serializer.save()

                booking = payment.booking
                booking.payment_status = "paid"
                booking.save()

                payment.status = "success"
                payment.paid_at = timezone.now()
                payment.save()

                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)  


class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Payment.objects.get(pk=pk, booking__user=user)
        except Payment.DoesNotExist:
            return None

    def get(self, request, pk):
        payment = self.get_object(pk, request.user)  
        if payment is None:                           
            return Response({"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = PaymentSerializer(payment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):  
        with transaction.atomic():
            payment = self.get_object(pk, request.user)  
            if payment is None:                           
                return Response({"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

            if payment.status != "success":
                return Response(
                    {"error": "Only successful payments can be refunded"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            refund_amount = request.data.get("refund_amount")
            if not refund_amount:
                return Response({"error": "Refund amount is required"}, status=status.HTTP_400_BAD_REQUEST)

            if float(refund_amount) > float(payment.amount):  
                return Response(
                    {"error": "Refund amount cannot exceed original amount"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            payment.status = "refunded"
            payment.refund_amount = refund_amount
            payment.save()

            booking = payment.booking
            booking.payment_status = "failed"  
            booking.save()

            return Response(
                {"message": "Payment refunded successfully"},
                status=status.HTTP_200_OK
            )

# ─── Admin: All payments across all sites ────────────────────────────────────
from accounts.views import IsAdmin
from django.db.models import Q

class AdminPaymentListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        payments = (
            Payment.objects
            .select_related(
                "booking__user",
                "booking__vehicle",
                "booking__parking_slot__parking_site",
                "booking__parking_slot__parking_site__owner",
            )
            .order_by("-paid_at")
        )

        # ── Filters ────────────────────────────────────────────────────────
        status_filter = request.query_params.get("status")   # paid|unpaid|refunded
        method_filter = request.query_params.get("method")   # Cash|EasyPaisa|Card
        site_filter   = request.query_params.get("site_id")  # UUID
        date_from     = request.query_params.get("date_from") # YYYY-MM-DD
        date_to       = request.query_params.get("date_to")   # YYYY-MM-DD
        search        = request.query_params.get("search")    # plate / txn id / owner name

        if status_filter:
            payments = payments.filter(status=status_filter)
        if method_filter:
            payments = payments.filter(payment_method__iexact=method_filter)
        if site_filter:
            payments = payments.filter(
                booking__parking_slot__parking_site__id=site_filter
            )
        if date_from:
            payments = payments.filter(paid_at__date__gte=date_from)
        if date_to:
            payments = payments.filter(paid_at__date__lte=date_to)
        if search:
            payments = payments.filter(
                Q(booking__vehicle__plate_number__icontains=search) |
                Q(booking__parking_slot__parking_site__owner__full_name__icontains=search) |
                Q(booking__parking_slot__parking_site__name__icontains=search) |
                Q(id__icontains=search)
            )

        data = []
        for p in payments:
            try:
                site_name  = p.booking.parking_slot.parking_site.name
                owner_name = p.booking.parking_slot.parking_site.owner.full_name
                plate      = p.booking.vehicle.plate_number
                user_name  = p.booking.user.full_name if p.booking.user else "—"
            except Exception:
                site_name  = "—"
                owner_name = "—"
                plate      = "—"
                user_name  = "—"

            data.append({
                "id":             str(p.id),
                "booking_id":     str(p.booking.id),
                "site":           site_name,
                "owner":          owner_name,
                "user":           user_name,
                "plate":          plate,
                "amount":         str(p.amount),
                "refund_amount":  str(p.refund_amount) if p.refund_amount else None,
                "method":         p.payment_method or "—",
                "payment_type":   p.payment_type,
                "status":         p.status,
                "currency":       p.currency,
                "paid_at":        p.paid_at,
            })

        return Response(data, status=status.HTTP_200_OK)


class AdminPaymentRefundView(APIView):
    """Admin can refund any payment regardless of who made it."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        with transaction.atomic():
            try:
                payment = Payment.objects.get(pk=pk)
            except Payment.DoesNotExist:
                return Response(
                    {"error": "Payment not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if payment.status != "success":
                return Response(
                    {"error": "Only successful payments can be refunded"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            refund_amount = request.data.get("refund_amount")
            if not refund_amount:
                return Response(
                    {"error": "refund_amount is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if float(refund_amount) > float(payment.amount):
                return Response(
                    {"error": "Refund amount cannot exceed original amount"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            payment.status        = "refunded"
            payment.refund_amount = refund_amount
            payment.save()

            booking = payment.booking
            booking.payment_status = "failed"
            booking.save()

            return Response(
                {"message": "Payment refunded successfully"},
                status=status.HTTP_200_OK,
            )
