import pandas as pd


def build_training_dataframe():
    """
    Fetch historical booking data from DB and extract ML features.
    Returns empty DataFrame if DB query fails or no data exists.
    """
    try:
        from bookings.models import Booking
        from parking.models import ParkingSlot

        qs = Booking.objects.filter(
            status="completed",
            entry_time__isnull=False
        ).select_related("parking_slot__parking_site")

        rows = []
        for b in qs:
            site = b.parking_slot.parking_site
            total = ParkingSlot.objects.filter(parking_site=site).count()
            if total == 0:
                continue

            occupied = Booking.objects.filter(
                parking_slot__parking_site=site,
                status="active",
                entry_time__lte=b.entry_time,
            ).count()

            rows.append({
                "hour":           b.entry_time.hour,
                "day_of_week":    b.entry_time.weekday(),
                "is_weekend":     int(b.entry_time.weekday() >= 5),
                "month":          b.entry_time.month,
                "site_id":        str(site.id),
                "occupancy_rate": min(occupied / total, 1.0),
            })

        return pd.DataFrame(rows)

    except Exception as e:
        # DB query failed — return empty DataFrame so synthetic data is used
        print(f"DB query failed: {e}")
        print("Falling back to synthetic data...")
        return pd.DataFrame()


def generate_synthetic_data(days=180):
    """
    Generate 6 months of realistic synthetic parking data.
    Used during development when no real bookings exist yet.
    Follows Pakistani office-hour traffic patterns.
    """
    import numpy as np

    rows = []
    for day in range(days):
        weekday = day % 7  # 0=Monday, 6=Sunday

        for hour in range(6, 23):  # Operating hours: 6 AM to 11 PM

            if weekday == 6:
                # Sunday — very low traffic
                occ = np.random.uniform(0.05, 0.20)

            elif weekday == 5:
                # Saturday — moderate traffic only in morning
                if 9 <= hour <= 14:
                    occ = np.random.uniform(0.40, 0.65)
                else:
                    occ = np.random.uniform(0.10, 0.30)

            else:
                # Weekday traffic pattern
                if 8 <= hour <= 10:
                    # Morning rush — office arrival time
                    occ = np.random.uniform(0.75, 0.95)
                elif 17 <= hour <= 19:
                    # Evening rush — office departure time
                    occ = np.random.uniform(0.70, 0.90)
                elif 12 <= hour <= 14:
                    # Lunch hour — moderate increase
                    occ = np.random.uniform(0.45, 0.65)
                elif 11 <= hour <= 16:
                    # Mid-day — steady moderate traffic
                    occ = np.random.uniform(0.35, 0.55)
                else:
                    # Early morning or late night — very low traffic
                    occ = np.random.uniform(0.05, 0.25)

            # Add small random noise to simulate real-world variation
            occ = min(max(occ + np.random.normal(0, 0.05), 0), 1)

            rows.append({
                "hour":           hour,
                "day_of_week":    weekday,
                "is_weekend":     int(weekday >= 5),
                "month":          (day // 30) + 1,
                "site_id":        "site_A" if day % 2 == 0 else "site_B",
                "occupancy_rate": round(occ, 3),
            })

    return pd.DataFrame(rows)