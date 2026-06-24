from rest_framework import serializers
from django.utils import timezone
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'user', 'parking_slot', 'vehicle',
            'entry_time', 'exit_time', 'status',
            'payment_status','payment_method', 'estimated_amount',
            'overstay_grace', 'duration', 'created_at',
        ]
        read_only_fields = ['id', 'user', 'status', 'payment_status','payment_method', 'created_at']

    def get_duration(self, obj):
        if obj.exit_time:
            duration = obj.exit_time - obj.entry_time
            total_minutes = int(duration.total_seconds() / 60)
            hours = total_minutes // 60
            minutes = total_minutes % 60
            return f"{hours}h {minutes}m"
        return "Still Parked"

    
    def validate_entry_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Entry time cannot be in past")
        return value

   
    def validate_exit_time(self, value):
        if value and value < timezone.now():
            raise serializers.ValidationError("Exit time cannot be in past")
        return value  

    
    def validate(self, data):
        slot = data.get('parking_slot')
        entry = data.get('entry_time')
        exit = data.get('exit_time')

        if entry and exit and exit < entry:
            raise serializers.ValidationError("Exit time cannot be before entry time")

        if slot:
            if slot.is_occupied:
                raise serializers.ValidationError("This slot is already occupied")
            if slot.is_reserved:
                raise serializers.ValidationError("This slot is already reserved")

        return data