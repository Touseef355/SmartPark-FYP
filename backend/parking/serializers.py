from rest_framework import serializers
from .models import ParkingSite,ParkingSlot,Vehicle

class ParkingSiteSerializer(serializers.ModelSerializer):
    owner=serializers.StringRelatedField(read_only=True)

    class Meta:
        model=ParkingSite
        fields = ['id', 'owner', 'name', 'location', 'capacity', 'created_at']
        read_only_fields=['id','created_at']


class ParkingSlotSerializer(serializers.ModelSerializer):
    
    class Meta:
        model=ParkingSlot
        fields = ['id', 'parking_site', 'slot_number', 'slot_type', 
                  'is_occupied', 'is_reserved', 'price_per_hour', 'updated_at']
        read_only_fields = ['id', 'updated_at','parking_site']

class VehicleSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Vehicle
        fields = ['id', 'user', 'name', 'plate_number', 
                  'vehicle_type', 'color', 'created_at']
        read_only_fields = ['id', 'created_at']