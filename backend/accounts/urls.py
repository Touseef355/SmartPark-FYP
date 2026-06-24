from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    ProfileView,
    AccountDeleteView,
    SendOTPView,
    VerifyOTPView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
    PasswordResetConfirmView,
    ChangePasswordView,
    # Admin views
    AdminUserListView,
    AdminToggleUserStatusView,
    AdminApproveOwnerView,
    AdminDashboardStatsView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("delete/", AccountDeleteView.as_view(), name="delete"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("otp/send/", SendOTPView.as_view(), name="send-otp"),
    path("otp/verify/", VerifyOTPView.as_view(), name="verify-otp"),
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password/verify/", PasswordResetVerifyView.as_view(), name="password-verify"),
    path("password/confirm/", PasswordResetConfirmView.as_view(), name="password-confirm"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),

    # ── Admin ──────────────────────────────────────────────────────────────
    # GET  /api/auth/admin/users/              → list all users
    # GET  /api/auth/admin/users/?role=parking_owner&status=pending  → filter
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),

    # PATCH /api/auth/admin/users/<uuid>/toggle/  body: {"action": "block"|"unblock"}
    path("admin/users/<uuid:pk>/toggle/", AdminToggleUserStatusView.as_view(), name="admin-toggle-user"),

    # PATCH /api/auth/admin/owners/<uuid>/approve/  body: {"action": "approve"|"reject"}
    path("admin/owners/<uuid:pk>/approve/", AdminApproveOwnerView.as_view(), name="admin-approve-owner"),

    # GET /api/auth/admin/stats/
    path("admin/stats/", AdminDashboardStatsView.as_view(), name="admin-dashboard-stats"),
]