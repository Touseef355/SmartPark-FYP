import random
import time
from twilio.rest import Client
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate,get_user_model  
from django.core.mail import send_mail
from django.core.cache import cache
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
                    "role"  : user.role,     
                    "name"  : user.full_name,
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
            "id"           : str(user.id),
            "email"        : user.email,
            "full_name"    : user.full_name,
            "phone_number" : user.phone_number,
            "role"         : user.role,
            "address"      : user.address,
            "profile_photo": request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None,
            "created_at"   : user.created_at
        }, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user
        
        # Update fields
        user.full_name    = request.data.get("full_name", user.full_name)
        user.phone_number = request.data.get("phone_number", user.phone_number)
        user.address = request.data.get("address",user.address)
       # Site assign if cashier
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
        # Photo upload
        if "profile_photo" in request.FILES:
            user.profile_photo = request.FILES["profile_photo"]
        
        user.save()
        
        return Response({
            "message"      : "Profile updated successfully",
            "profile_photo": request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None
        }, status=status.HTTP_200_OK)
class AccountDeleteView(APIView):
    permission_classes=[IsAuthenticated]

    def delete(self,request):
        password=request.data.get("password")
        if not password:
            return Response(
                {"error": "Password is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(password):
            return Response({"error":"Incorrect Password"},status=status.HTTP_400_BAD_REQUEST)
        request.user.delete()
        return Response({"message":"Account deleted successfully"},status=status.HTTP_200_OK)

class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number = request.data.get("phone_number")
        if not phone_number:
            return Response(
                {"error":"Phone number required"},
                status = status.HTTP_400_BAD_REQUEST
            )
        try:
            client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
            client.verify.v2.services(
                settings.TWILIO_VERIFY_SID
            ).verifications.create(
                to= phone_number,
                channel="sms"
            )
            return Response(
                {"message":"OTP sent successfully"},
                status = status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error":str(e)},
                status = status.HTTP_400_BAD_REQUEST
            )
class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number =  request.data.get("phone_number")
        otp_code = request.data.get("otp_code")
        if not phone_number or not otp_code:
            return Response(
                {"error":"Phone number and OTP required"},
                status = status.HTTP_400_BAD_REQUEST
            )
        try:
            client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
            result =client.verify.v2.services(
                settings.TWILIO_VERIFY_SID
            ).verification_checks.create(
                to = phone_number,
                code = otp_code
            )

            if result.status == "approved":
                return Response(
                    {"message":"OTP verified successfully"},
                    status = status.HTTP_200_OK
                )
            else:
                return Response(
                    {"error":"Invalid OTP"},
                    status = status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"error":str(e)},
                status= status.HTTP_400_BAD_REQUEST
            )
        

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"error":"Email is required"},
                status = status.HTTP_400_BAD_REQUEST
            )
        try:
            user= User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error":"User not found"},
                status = status.HTTP_400_BAD_REQUEST
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
                {"message":"OTP sent to email successfully"},
                status = status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PasswordResetVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get("email")
        otp_code = request.data.get("otp_code")

        if not email or not otp_code:
            return Response(
                {"error": "Email and OTP required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Session se OTP lo
        saved_otp = cache.get(f"reset_otp_{email}")

        if not saved_otp:
            return Response(
                {"error": "OTP expired or not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if time.time() - saved_otp["time"] > 300:
            return Response({"error":"OTP Expired"},status=status.HTTP_400_BAD_REQUEST)

        if saved_otp["code"] != otp_code:
            return Response(
                {"error": "Invalid OTP"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # OTP sahi hai — session mein mark karo
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
                {"error":"All fields required"},
                status = status.HTTP_400_BAD_REQUEST 
            )
        if new_password != confirm_password:
            return Response(
                {
                    "error":"Passwords do not match"
                },
                status = status.HTTP_400_BAD_REQUEST
            )
        is_verified = cache.get(f"reset_verified_{email}")

        if not is_verified:
            return Response(
                {"error":"OTP not verified"},
                status = status.HTTP_400_BAD_REQUEST
            )
        try:
            user =User.objects.get(email=email)
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
from rest_framework.permissions import BasePermission

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

        role   = request.query_params.get("role")
        status_filter = request.query_params.get("status")   # active | blocked | pending

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
                "id":           str(u.id),
                "full_name":    u.full_name,
                "email":        u.email,
                "phone_number": u.phone_number,
                "role":         u.role,
                "is_active":    u.is_active,
                "is_approved":  u.is_approved,
                "status": (
                    "blocked"  if not u.is_active else
                    "pending"  if u.role == "parking_owner" and not u.is_approved else
                    "active"
                ),
                "site_id":    str(u.site.id) if u.site else None,
                "site_name":  u.site.name   if u.site else None,
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

        action = request.data.get("action")   # "block" | "unblock"
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

        action = request.data.get("action")   # "approve" | "reject"
        if action not in ("approve", "reject"):
            return Response(
                {"error": "action must be 'approve' or 'reject'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "approve":
            user.is_approved = True
            user.is_active   = True
            user.save(update_fields=["is_approved", "is_active"])
            return Response(
                {"message": "Owner approved successfully.", "is_approved": True},
                status=status.HTTP_200_OK,
            )
        else:
            # Reject: deactivate the account so they can't log in
            user.is_approved = False
            user.is_active   = False
            user.save(update_fields=["is_approved", "is_active"])
            return Response(
                {"message": "Owner rejected successfully.", "is_approved": False},
                status=status.HTTP_200_OK,
            )


# ─── Admin: Dashboard Stats ───────────────────────────────────────────────────
from django.utils import timezone
from django.db.models import Sum

class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from parking.models import ParkingSite, ParkingSlot
        from bookings.models import Booking
        from payments.models import Payment
        from ai_module.models import AiLog

        today = timezone.now().date()

        # ── Sites ──────────────────────────────────────────────────────────
        total_sites  = ParkingSite.objects.count()

        # ── Users ──────────────────────────────────────────────────────────
        total_users         = User.objects.filter(role="user").count()
        total_owners        = User.objects.filter(role="parking_owner").count()
        pending_owners      = User.objects.filter(
            role="parking_owner", is_approved=False, is_active=True
        ).count()
        active_owners       = User.objects.filter(
            role="parking_owner", is_approved=True, is_active=True
        ).count()

        # ── Revenue ────────────────────────────────────────────────────────
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

        # ── Active vehicles (bookings with status=active) ──────────────────
        active_vehicles = Booking.objects.filter(status="active").count()

        # ── Recent transactions (last 5 paid) ──────────────────────────────
        recent_payments = (
            Payment.objects
            .filter(status="success")
            .select_related("booking__vehicle", "booking__parking_slot__parking_site")
            .order_by("-paid_at")[:5]
        )
        recent_transactions = []
        for p in recent_payments:
            try:
                site   = p.booking.parking_slot.parking_site.name
                plate  = p.booking.vehicle.plate_number
            except Exception:
                site  = "—"
                plate = "—"
            recent_transactions.append({
                "id":     str(p.id),
                "site":   site,
                "plate":  plate,
                "amount": str(p.amount),
                "method": p.payment_method or "—",
                "status": p.status,
                "date":   p.paid_at,
            })

        # ── Pending owner approvals (for dashboard list) ───────────────────
        pending_owner_list = []
        for u in User.objects.filter(
            role="parking_owner", is_approved=False, is_active=True
        ).order_by("-created_at")[:5]:
            pending_owner_list.append({
                "id":    str(u.id),
                "name":  u.full_name,
                "email": u.email,
                "phone": u.phone_number,
                "joined": u.created_at,
            })

        # ── System status ──────────────────────────────────────────────────
        total_slots    = ParkingSlot.objects.count()
        occupied_slots = ParkingSlot.objects.filter(is_occupied=True).count()

        # AI accuracy: avg confidence of approved logs (last 100)
        ai_logs = AiLog.objects.filter(status="approved").order_by("-detected_at")[:100]
        ai_accuracy = None
        if ai_logs.exists():
            avg = sum(l.confidence_score for l in ai_logs) / ai_logs.count()
            ai_accuracy = round(avg * 100, 1)

        overstay_alerts  = AiLog.objects.filter(
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
                "total_users":   total_users,
                "total_owners":  total_owners,
                "active_owners": active_owners,
                "pending_owners": pending_owners,
            },
            "revenue": {
                "today":  str(today_revenue),
                "total":  str(total_revenue),
            },
            "vehicles": {
                "active": active_vehicles,
            },
            "slots": {
                "total":    total_slots,
                "occupied": occupied_slots,
            },
            "system": {
                "ai_accuracy":      ai_accuracy,
                "overstay_alerts":  overstay_alerts,
                "manual_overrides": manual_overrides,
            },
            "recent_transactions": recent_transactions,
            "pending_owner_approvals": pending_owner_list,
        }, status=status.HTTP_200_OK)
