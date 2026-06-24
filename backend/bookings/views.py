from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db import transaction
from .models import Booking
from .serializers import BookingSerializer
from parking.models import ParkingSlot


class BookingView(APIView):
    permission_classes = [IsAuthenticated]  

    def get(self, request):
        bookings = Booking.objects.filter(user=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        with transaction.atomic():
            slot_id = request.data.get('parking_slot')
            try:
                slot = ParkingSlot.objects.select_for_update().get(pk=slot_id)
            except ParkingSlot.DoesNotExist:
                return Response(
                    {"error": "Slot not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            if slot.is_occupied:
                return Response(
                    {"error": "Slot is already occupied"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = BookingSerializer(data=request.data)
            if serializer.is_valid():
                booking = serializer.save(user=request.user)
                slot.is_occupied = True
                slot.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Booking.objects.get(pk=pk, user=user)
        except Booking.DoesNotExist:
            return None

    def get(self, request, pk):
        booking = self.get_object(pk, request.user)
        if booking is None:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        with transaction.atomic():
            booking = self.get_object(pk, request.user)
            if booking is None:
                return Response(
                    {"error": "Booking not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            if booking.status != "active":
                return Response(
                    {"error": "Only active bookings can be completed"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = BookingSerializer(booking, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save(status="completed")
                slot = booking.parking_slot
                slot.is_occupied = False
                slot.save()
                return Response(serializer.data, status=status.HTTP_200_OK)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        with transaction.atomic():
            booking = self.get_object(pk, request.user)
            if booking is None:
                return Response(
                    {"error": "Booking not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            if booking.status != "active":
                return Response(
                    {"error": "Only active bookings can be cancelled"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            slot = booking.parking_slot
            slot.is_occupied = False
            slot.save()

            booking.status = "cancelled"
            booking.save()

            return Response(
                {"message": "Booking cancelled successfully"},
                status=status.HTTP_200_OK
            )
        
class BookingExtendView(APIView):
    permission_classes=[IsAuthenticated]

    def get_object(self,pk,user):
        try:
            return Booking.objects.get(pk=pk,user=user)
        except Booking.DoesNotExist:
            return None
      
    
    def put(self,request,pk):
        booking=self.get_object(pk=pk,user=request.user)

        if booking is None:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if booking.status != "active":
            return Response(
                {"error": "Only active bookings can be extended"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extension limit check
        if booking.extension_count >= 3:
            return Response(
                {"error": "Maximum extension limit reached"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_exit_time = parse_datetime(request.data.get("extended_exit_time"))

        if not new_exit_time:
            return Response(
                {"error": "Invalid date format"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_exit_time < timezone.now():
            return Response(
                {"error": "Extended time cannot be in the past"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # DB update
        booking.extended_exit_time = new_exit_time  
        booking.extension_count += 1
        booking.save()

        return Response(
            {"message": "Time extended successfully"},
            status=status.HTTP_200_OK
        )