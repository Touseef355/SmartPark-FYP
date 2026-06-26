import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sps_backend.settings')
django.setup()

from django.db import connection
from accounts.models import User

def fix_orphaned_records():
    with connection.cursor() as cursor:
        print("Checking for orphaned parking sites (owner_id not in public.users):")
        cursor.execute("""
            SELECT id, name, owner_id 
            FROM public.parking_sites 
            WHERE owner_id NOT IN (SELECT id FROM public.users);
        """)
        orphaned = cursor.fetchall()
        print(f"Found {len(orphaned)} orphaned parking sites.")
        
        for site_id, name, owner_id in orphaned:
            owner_id_str = str(owner_id)
            site_id_str = str(site_id)
            print(f"Orphaned Site: {name} (ID: {site_id_str}) | Owner ID: {owner_id_str}")
            
            # Let's create a placeholder user in public.users for this owner_id!
            dummy_email = f"placeholder_{owner_id_str[:8]}@example.com"
            print(f"  --> Creating placeholder user in public.users: {dummy_email}...")
            try:
                # Check if email is already taken (unlikely, but safe)
                if User.objects.filter(email=dummy_email).exists():
                    dummy_email = f"placeholder_{owner_id_str[:8]}_{site_id_str[:4]}@example.com"
                
                # Check if phone number is unique
                import random
                phone = "0399" + "".join(str(random.randint(0, 9)) for _ in range(7))
                while User.objects.filter(phone_number=phone).exists():
                    phone = "0399" + "".join(str(random.randint(0, 9)) for _ in range(7))
                
                # Create user manually with specific UUID
                placeholder = User.objects.create(
                    id=owner_id,
                    email=dummy_email,
                    full_name=f"Placeholder Owner ({name})",
                    phone_number=phone,
                    role="parking_owner",
                    is_approved=True
                )
                placeholder.set_password("PlaceholderPassword123")
                placeholder.save()
                print(f"  [SUCCESS] Created placeholder user: {placeholder.email}")
            except Exception as e:
                print(f"  [ERROR] Failed to create placeholder user: {e}")
                print("  --> Deleting orphaned site as fallback...")
                cursor.execute(f"DELETE FROM public.parking_sites WHERE id = %s;", [site_id])
                print("  [SUCCESS] Deleted orphaned site.")

        print("\nRetrying constraint creation...")
        try:
            cursor.execute("ALTER TABLE public.parking_sites DROP CONSTRAINT IF EXISTS parking_sites_owner_id_fkey CASCADE;")
            cursor.execute("""
                ALTER TABLE public.parking_sites 
                ADD CONSTRAINT parking_sites_owner_id_fkey 
                FOREIGN KEY (owner_id) 
                REFERENCES public.users(id) 
                ON DELETE CASCADE;
            """)
            print("Recreated parking_sites_owner_id_fkey pointing to public.users successfully!")
        except Exception as e:
            print(f"Error recreating constraint: {e}")

if __name__ == '__main__':
    fix_orphaned_records()
