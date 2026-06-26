import random
import time
import secrets
import string
from twilio.rest import Client
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum
from .serializers import RegisterSerializer

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token)
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = get_tokens_for_user(user)
            return Response(
                {"message": "Registered Successfully", "tokens": token},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, email=email, password=password)

        if user is None:
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        token = get_tokens_for_user(user)
        site_id = None
        if user.site:
            site_id = str(user.site.id)

        return Response(
            {
                "message": "Login Successful",
                "tokens": token,
                "role": user.role,
                "name": user.full_name,
                "site_id": site_id,
                "user_id": str(user.id),
            },
            status=status.HTTP_200_OK
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Logged out successfully"},
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {"error": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST
            )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not current_password or not new_password or not confirm_password:
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(current_password):
            return Response({"error": "Current password is incorrect"}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({"error": "New passwords do not match"}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({"error": "Password must be at least 6 characters"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "Password changed successfully"}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "phone_number": user.phone_number,
            "role": user.role,
            "address": user.address,
            "profile_photo": request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None,
            "created_at": user.created_at
        }, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user

        user.full_name = request.data.get("full_name", user.full_name)
        user.phone_number = request.data.get("phone_number", user.phone_number)
        user.address = request.data.get("address", user.address)
        site_id = request.data.get("site")
        if site_id:
            from parking.models import ParkingSite
            try:
                site = ParkingSite.objects.get(id=site_id)
                user.site = site
            except ParkingSite.DoesNotExist:
                return Response(
                    {"error": "Site not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        if "profile_photo" in request.FILES:
            user.profile_photo = request.FILES["profile_photo"]

        user.save()

        return Response({
            "message": "Profile updated successfully",
            "profile_photo": request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None
        }, status=status.HTTP_200_OK)


class AccountDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        password = request.data.get("password")
        if not password:
            return Response(
                {"error": "Password is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(password):
            return Response({"error": "Incorrect Password"}, status=status.HTTP_400_BAD_REQUEST)
        request.user.delete()
        return Response({"message": "Account deleted successfully"}, status=status.HTTP_200_OK)


class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number = request.data.get("phone_number")
        if not phone_number:
            return Response(
                {"error": "Phone number required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
            client.verify.v2.services(
                settings.TWILIO_VERIFY_SID
            ).verifications.create(
                to=phone_number,
                channel="sms"
            )
            return Response(
                {"message": "OTP sent successfully"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number = request.data.get("phone_number")
        otp_code = request.data.get("otp_code")
        if not phone_number or not otp_code:
            return Response(
                {"error": "Phone number and OTP required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
            result = client.verify.v2.services(
                settings.TWILIO_VERIFY_SID
            ).verification_checks.create(
                to=phone_number,
                code=otp_code
            )

            if result.status == "approved":
                return Response(
                    {"message": "OTP verified successfully"},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {"error": "Invalid OTP"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        otp_code = str(random.randint(100000, 999999))

        cache.set(f"reset_otp_{email}", {
            "code": otp_code,
            "time": time.time()
        }, timeout=300)

        try:
            send_mail(
                subject="Smart Parking - Password Reset OTP",
                message=f"Your password reset OTP is: {otp_code}",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email]
            )
            return Response(
                {"message": "OTP sent to email successfully"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PasswordResetVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp_code = request.data.get("otp_code")

        if not email or not otp_code:
            return Response(
                {"error": "Email and OTP required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        saved_otp = cache.get(f"reset_otp_{email}")

        if not saved_otp:
            return Response(
                {"error": "OTP expired or not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if time.time() - saved_otp["time"] > 300:
            return Response({"error": "OTP Expired"}, status=status.HTTP_400_BAD_REQUEST)

        if saved_otp["code"] != otp_code:
            return Response(
                {"error": "Invalid OTP"},
                status=status.HTTP_400_BAD_REQUEST
            )

        cache.set(f"reset_verified_{email}", True, timeout=300)

        return Response(
            {"message": "OTP verified successfully"},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not email or not new_password or not confirm_password:
            return Response(
                {"error": "All fields required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if new_password != confirm_password:
            return Response(
                {"error": "Passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST
            )
        is_verified = cache.get(f"reset_verified_{email}")

        if not is_verified:
            return Response(
                {"error": "OTP not verified"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        user.set_password(new_password)
        user.save()

        cache.delete(f"reset_otp_{email}")
        cache.delete(f"reset_verified_{email}")

        return Response(
            {"message": "Password reset successfully"},
            status=status.HTTP_200_OK
        )


# ─── Admin-only permission helper ────────────────────────────────────────────

class IsAdmin(BasePermission):
    """Allow access only to users with role='admin'."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "admin"
        )


# ─── Admin: List all users (with optional role / status filters) ──────────────
class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all().order_by("-created_at")

        role = request.query_params.get("role")
        status_filter = request.query_params.get("status")

        if role:
            users = users.filter(role=role)

        if status_filter == "active":
            users = users.filter(is_active=True, is_approved=True)
        elif status_filter == "blocked":
            users = users.filter(is_active=False)
        elif status_filter == "pending":
            users = users.filter(role="parking_owner", is_approved=False, is_active=True)

        data = [
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "phone_number": u.phone_number,
                "role": u.role,
                "is_active": u.is_active,
                "is_approved": u.is_approved,
                "status": (
                    "blocked" if not u.is_active else
                    "pending" if u.role == "parking_owner" and not u.is_approved else
                    "active"
                ),
                "site_id": str(u.site.id) if u.site else None,
                "site_name": u.site.name if u.site else None,
                "created_at": u.created_at,
                "profile_photo": (
                    request.build_absolute_uri(u.profile_photo.url)
                    if u.profile_photo else None
                ),
            }
            for u in users
        ]
        return Response(data, status=status.HTTP_200_OK)


# ─── Admin: Block / Unblock any user ─────────────────────────────────────────
class AdminToggleUserStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")
        if action not in ("block", "unblock"):
            return Response(
                {"error": "action must be 'block' or 'unblock'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = (action == "unblock")
        user.save(update_fields=["is_active"])

        return Response(
            {
                "message": f"User {action}ed successfully.",
                "is_active": user.is_active,
            },
            status=status.HTTP_200_OK,
        )


# ─── Admin: Approve / Reject a parking owner ─────────────────────────────────
class AdminApproveOwnerView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role="parking_owner")
        except User.DoesNotExist:
            return Response(
                {"error": "Parking owner not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = request.data.get("action")
        if action not in ("approve", "reject"):
            return Response(
                {"error": "action must be 'approve' or 'reject'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "approve":
            user.is_approved = True
            user.is_active = True
            user.save(update_fields=["is_approved", "is_active"])
            return Response(
                {"message": "Owner approved successfully.", "is_approved": True},
                status=status.HTTP_200_OK,
            )
        else:
            user.is_approved = False
            user.is_active = False
            user.save(update_fields=["is_approved", "is_active"])
            return Response(
                {"message": "Owner rejected successfully.", "is_approved": False},
                status=status.HTTP_200_OK,
            )


# ─── Admin: Dashboard Stats ───────────────────────────────────────────────────
class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from parking.models import ParkingSite, ParkingSlot
        from bookings.models import Booking
        from payments.models import Payment
        from ai_module.models import AiLog

        today = timezone.now().date()

        total_sites = ParkingSite.objects.count()

        total_users = User.objects.filter(role="user").count()
        total_owners = User.objects.filter(role="parking_owner").count()
        pending_owners = User.objects.filter(
            role="parking_owner", is_approved=False, is_active=True
        ).count()
        active_owners = User.objects.filter(
            role="parking_owner", is_approved=True, is_active=True
        ).count()

        today_revenue = (
            Payment.objects
            .filter(status="success", paid_at__date=today)
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        total_revenue = (
            Payment.objects
            .filter(status="success")
            .aggregate(total=Sum("amount"))["total"] or 0
        )

        active_vehicles = Booking.objects.filter(status="active").count()

        recent_payments = (
            Payment.objects
            .filter(status="success")
            .select_related("booking__vehicle", "booking__parking_slot__parking_site")
            .order_by("-paid_at")[:5]
        )
        recent_transactions = []
        for p in recent_payments:
            try:
                site = p.booking.parking_slot.parking_site.name
                plate = p.booking.vehicle.plate_number
            except Exception:
                site = "—"
                plate = "—"
            recent_transactions.append({
                "id": str(p.id),
                "site": site,
                "plate": plate,
                "amount": str(p.amount),
                "method": p.payment_method or "—",
                "status": p.status,
                "date": p.paid_at,
            })

        pending_owner_list = []
        for u in User.objects.filter(
            role="parking_owner", is_approved=False, is_active=True
        ).order_by("-created_at")[:5]:
            pending_owner_list.append({
                "id": str(u.id),
                "name": u.full_name,
                "email": u.email,
                "phone": u.phone_number,
                "joined": u.created_at,
            })

        total_slots = ParkingSlot.objects.count()
        occupied_slots = ParkingSlot.objects.filter(is_occupied=True).count()

        ai_logs = AiLog.objects.filter(status="approved").order_by("-detected_at")[:100]
        ai_accuracy = None
        if ai_logs.exists():
            avg = sum(l.confidence_score for l in ai_logs) / ai_logs.count()
            ai_accuracy = round(avg * 100, 1)

        overstay_alerts = AiLog.objects.filter(
            log_type="exit", status="pending"
        ).count()
        manual_overrides = AiLog.objects.filter(
            detected_at__date=today
        ).count()

        return Response({
            "sites": {
                "total": total_sites,
            },
            "users": {
                "total_users": total_users,
                "total_owners": total_owners,
                "active_owners": active_owners,
                "pending_owners": pending_owners,
            },
            "revenue": {
                "today": str(today_revenue),
                "total": str(total_revenue),
            },
            "vehicles": {
                "active": active_vehicles,
            },
            "slots": {
                "total": total_slots,
                "occupied": occupied_slots,
            },
            "system": {
                "ai_accuracy": ai_accuracy,
                "overstay_alerts": overstay_alerts,
                "manual_overrides": manual_overrides,
            },
            "recent_transactions": recent_transactions,
            "pending_owner_approvals": pending_owner_list,
        }, status=status.HTTP_200_OK)


# ─── Public: Submit a registration / contact query from landing page ──────────
from .models import OwnerRegistrationQuery
from .serializers import OwnerRegistrationQuerySerializer


class SubmitRegistrationQueryView(APIView):
    """
    POST /api/auth/registration-query/
    Public endpoint — anyone can submit a query from the landing page.
    Owner registration queries are saved as PENDING for admin review.
    General queries are also saved as PENDING.
    Admin will approve/respond separately.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OwnerRegistrationQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get("email")
        query_type = serializer.validated_data.get("query_type")

        # For owner registration: block if user already exists AND is already approved
        if query_type == "owner_registration":
            existing_user = User.objects.filter(email=email).first()
            if existing_user and existing_user.is_approved:
                return Response(
                    {"error": f"An active account with email {email} already exists. Please sign in instead."},
                    status=status.HTTP_409_CONFLICT,
                )

        # Save query as PENDING — admin will review and approve
        query = serializer.save()

        # Try to notify admin via email (non-blocking)
        try:
            if settings.EMAIL_HOST_USER:
                query_label = "Owner Registration Request" if query_type == "owner_registration" else "General Support Query"
                send_mail(
                    subject=f"[SmartPark] New {query_label} from {query.full_name}",
                    message=(
                        f"A new query has been submitted on SmartPark.\n\n"
                        f"Type: {query_label}\n"
                        f"Name: {query.full_name}\n"
                        f"Email: {query.email}\n"
                        f"Phone: {query.phone_number or 'N/A'}\n"
                        f"Message: {query.message or 'N/A'}\n\n"
                        f"Please log in to the admin dashboard to review and respond.\n"
                        f"Dashboard: http://localhost:5173/admin/dashboard/queries"
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[settings.EMAIL_HOST_USER],
                    fail_silently=True,
                )
        except Exception:
            pass  # Email failure should not break the response

        return Response(
            {
                "message": "Your query has been submitted successfully. Our team will review it and get back to you shortly.",
                "query": OwnerRegistrationQuerySerializer(query).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ─── Admin: List registration queries (with optional filters) ─────────────────
class AdminRegistrationQueryListView(APIView):
    """
    GET /api/auth/admin/registration-queries/
    Returns all queries; supports ?status=PENDING and ?query_type=owner_registration
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = OwnerRegistrationQuery.objects.all().order_by('-created_at')

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        query_type = request.query_params.get("query_type")
        if query_type:
            qs = qs.filter(query_type=query_type)

        serializer = OwnerRegistrationQuerySerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─── Admin: Approve & Onboard — atomic user + site creation ──────────────────
class AdminApproveOnboardView(APIView):
    """
    POST /api/auth/admin/queries/<int:query_id>/approve-onboard/
    Atomically:
      1. Set query status → APPROVED
      2. Create User (role=parking_owner) with auto-generated password
      3. Create ParkingSite linked to the new owner
      4. Send email to owner with credentials
      5. Return the generated credentials in the response
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    @staticmethod
    def _generate_password(length=12):
        """Generate a secure random password with mixed characters."""
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        pw = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%"),
        ]
        pw += [secrets.choice(alphabet) for _ in range(length - 4)]
        secrets.SystemRandom().shuffle(pw)
        return "".join(pw)

    def post(self, request, query_id):
        try:
            query = OwnerRegistrationQuery.objects.get(pk=query_id)
        except OwnerRegistrationQuery.DoesNotExist:
            return Response(
                {"error": "Query not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if query.query_type != "owner_registration":
            return Response(
                {"error": "This action is only for owner registration queries."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if query.status == "APPROVED":
            return Response(
                {"error": "This query has already been approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if a user with this email already exists
        if User.objects.filter(email=query.email).exists():
            return Response(
                {"error": f"A user with email {query.email} already exists. Cannot create duplicate account."},
                status=status.HTTP_409_CONFLICT,
            )

        temp_password = self._generate_password()

        try:
            with transaction.atomic():
                # 1. Mark query as approved
                query.status = "APPROVED"
                query.save(update_fields=["status"])

                # 2. Handle phone number
                phone_number = query.phone_number
                if not phone_number:
                    phone_number = "0399" + "".join(str(random.randint(0, 9)) for _ in range(7))
                    while User.objects.filter(phone_number=phone_number).exists():
                        phone_number = "0399" + "".join(str(random.randint(0, 9)) for _ in range(7))

                # 3. Create the parking owner user
                new_user = User.objects.create_user(
                    email=query.email,
                    full_name=query.full_name,
                    phone_number=phone_number,
                    password=temp_password,
                    role="parking_owner",
                )
                new_user.is_approved = True
                new_user.save(update_fields=["is_approved"])

                # 4. Create the ParkingSite
                from parking.models import ParkingSite
                site = ParkingSite.objects.create(
                    owner=new_user,
                    name=query.proposed_site_name or f"{query.full_name}'s Parking",
                    location="To be updated",
                    capacity=query.site_capacity or 20,
                )

                # 5. Link site to user
                new_user.site = site
                new_user.save(update_fields=["site"])

        except Exception as e:
            return Response(
                {"error": f"Onboarding failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 6. Send email to the new owner with credentials
        email_sent = False
        try:
            if settings.EMAIL_HOST_USER:
                send_mail(
                    subject="Welcome to SmartPark — Your Parking Owner Account is Ready!",
                    message=(
                        f"Dear {query.full_name},\n\n"
                        f"Congratulations! Your parking owner registration has been approved by the SmartPark admin team.\n\n"
                        f"Your account has been created with the following credentials:\n\n"
                        f"  Email:    {query.email}\n"
                        f"  Password: {temp_password}\n\n"
                        f"To access your Owner Dashboard:\n"
                        f"  1. Visit the SmartPark landing page: http://localhost:5500\n"
                        f"  2. Click 'Sign In' and select 'Parking Owner'\n"
                        f"  3. Enter the above credentials\n\n"
                        f"Your parking site '{site.name}' has been created and is ready to configure.\n\n"
                        f"For security, please change your password after your first login.\n\n"
                        f"Best regards,\n"
                        f"SmartPark Admin Team"
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[query.email],
                    fail_silently=False,
                )
                email_sent = True
        except Exception as e:
            email_sent = False
            print(f"Email sending failed: {str(e)}")

        return Response(
            {
                "message": "Owner onboarded successfully.",
                "email_sent": email_sent,
                "credentials": {
                    "email": query.email,
                    "temporary_password": temp_password,
                },
                "user": {
                    "id": str(new_user.id),
                    "full_name": new_user.full_name,
                    "role": new_user.role,
                },
                "site": {
                    "id": str(site.id),
                    "name": site.name,
                    "capacity": site.capacity,
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ─── Admin: Reject a query ────────────────────────────────────────────────────
class AdminRejectQueryView(APIView):
    """
    POST /api/auth/admin/queries/<int:query_id>/reject/
    Marks an owner registration query as REJECTED and optionally sends email.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, query_id):
        try:
            query = OwnerRegistrationQuery.objects.get(pk=query_id)
        except OwnerRegistrationQuery.DoesNotExist:
            return Response(
                {"error": "Query not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if query.status != "PENDING":
            return Response(
                {"error": f"Query is already {query.status} and cannot be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get("reason", "")
        query.status = "REJECTED"
        query.save(update_fields=["status"])

        # Send rejection email
        email_sent = False
        try:
            if settings.EMAIL_HOST_USER:
                message = (
                    f"Dear {query.full_name},\n\n"
                    f"Thank you for your interest in becoming a parking owner on SmartPark.\n\n"
                    f"After reviewing your registration request, we regret to inform you that "
                    f"we are unable to approve your application at this time.\n"
                )
                if rejection_reason:
                    message += f"\nReason: {rejection_reason}\n"
                message += (
                    f"\nIf you have any questions or would like to reapply, please contact our support team.\n\n"
                    f"Best regards,\n"
                    f"SmartPark Admin Team"
                )
                send_mail(
                    subject="SmartPark — Registration Request Update",
                    message=message,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[query.email],
                    fail_silently=False,
                )
                email_sent = True
        except Exception as e:
            print(f"Email sending failed: {str(e)}")

        return Response(
            {
                "message": "Query rejected successfully.",
                "email_sent": email_sent,
                "query": OwnerRegistrationQuerySerializer(query).data,
            },
            status=status.HTTP_200_OK,
        )


# ─── Admin: Respond to a general support query via email ──────────────────────
class AdminRespondToQueryView(APIView):
    """
    POST /api/auth/admin/queries/<int:query_id>/respond/
    Sends an email response to the person who submitted the general query.
    Marks query as RESOLVED.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, query_id):
        try:
            query = OwnerRegistrationQuery.objects.get(pk=query_id)
        except OwnerRegistrationQuery.DoesNotExist:
            return Response(
                {"error": "Query not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if query.query_type != "general_support":
            return Response(
                {"error": "This endpoint is only for general support queries."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_message = request.data.get("message", "").strip()
        if not response_message:
            return Response(
                {"error": "Response message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Send email response
        email_sent = False
        try:
            if settings.EMAIL_HOST_USER:
                send_mail(
                    subject=f"[SmartPark] Response to Your Query — {query.full_name}",
                    message=(
                        f"Dear {query.full_name},\n\n"
                        f"Thank you for contacting SmartPark support.\n\n"
                        f"Regarding your query:\n"
                        f"\"{query.message}\"\n\n"
                        f"Our response:\n"
                        f"{response_message}\n\n"
                        f"If you have any further questions, feel free to reach out to us.\n\n"
                        f"Best regards,\n"
                        f"SmartPark Support Team"
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[query.email],
                    fail_silently=False,
                )
                email_sent = True
        except Exception as e:
            return Response(
                {"error": f"Failed to send email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Mark query as resolved and save admin response
        query.status = "RESOLVED"
        query.admin_response = response_message
        query.save(update_fields=["status", "admin_response"])

        return Response(
            {
                "message": f"Response sent successfully to {query.email}.",
                "email_sent": email_sent,
                "query": OwnerRegistrationQuerySerializer(query).data,
            },
            status=status.HTTP_200_OK,
        )


# ─── Admin: Notification counts for dashboard badge ──────────────────────────
class AdminNotificationCountView(APIView):
    """
    GET /api/auth/admin/notifications/count/
    Returns counts of pending queries for the admin notification badge.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.utils.dateparse import parse_datetime

        qs = OwnerRegistrationQuery.objects.all()

        pending_owner = qs.filter(query_type='owner_registration', status='PENDING').count()
        pending_general = qs.filter(query_type='general_support', status='PENDING').count()
        total_pending = pending_owner + pending_general

        since = request.query_params.get('since')
        new_count = 0
        if since:
            since_dt = parse_datetime(since)
            if since_dt:
                new_count = qs.filter(created_at__gt=since_dt, status='PENDING').count()

        return Response({
            'total_pending': total_pending,
            'pending_owner_registrations': pending_owner,
            'pending_general_queries': pending_general,
            'new_since': new_count,
        }, status=status.HTTP_200_OK)
