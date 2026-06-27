from django.urls import path
from .views import (
    PaymentView,
    PaymentDetailView,
    AdminPaymentListView,
    AdminPaymentRefundView,
    OwnerPaymentsView,
)

urlpatterns = [
    # ── User-facing ────────────────────────────────────────────────────────
    # GET  /api/payments/          → my payments
    # POST /api/payments/          → create payment
    path("", PaymentView.as_view(), name="payment"),

    # GET /api/payments/<uuid>/    → my payment detail
    # PUT /api/payments/<uuid>/    → refund my payment
    path("<uuid:pk>/", PaymentDetailView.as_view(), name="payment-detail"),

    # ── Admin ──────────────────────────────────────────────────────────────
    # GET  /api/payments/admin/
    # GET  /api/payments/admin/?status=success&method=Cash&date_from=2026-05-01
    # GET  /api/payments/admin/?search=LEF-1234
    path("admin/", AdminPaymentListView.as_view(), name="admin-payment-list"),

    # PATCH /api/payments/admin/<uuid>/refund/   body: {"refund_amount": "120.00"}
    path("admin/<uuid:pk>/refund/", AdminPaymentRefundView.as_view(), name="admin-payment-refund"),

    # ── Owner ─────────────────────────────────────────────────────────────
    # GET  /api/payments/owner/
    path("owner/", OwnerPaymentsView.as_view(), name="owner-payments"),
]
