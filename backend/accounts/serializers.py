from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OwnerRegistrationQuery

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'phone_number', 
                  'password', 'confirm_password', 'role']  

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")  
        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        user = User.objects.create_user(**validated_data)
        # Parking owners require admin approval before they can operate
        if user.role == "parking_owner":
            user.is_approved = False
            user.save(update_fields=["is_approved"])
        return user


class OwnerRegistrationQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerRegistrationQuery
        fields = [
            "id", "full_name", "email", "phone_number",
            "query_type", "proposed_site_name", "site_capacity",
            "message", "admin_response", "status", "created_at",
        ]
        read_only_fields = ["id", "status", "admin_response", "created_at"]