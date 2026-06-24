from django.urls import path
from .views import BookingView, BookingDetailView,BookingExtendView

urlpatterns = [
    path('', BookingView.as_view(), name='bookings'),
    
    path('<uuid:pk>/', BookingDetailView.as_view(), name='booking-detail'),
    path('<uuid:pk>/extend/',BookingExtendView.as_view(),name="Extend-time")
 
]