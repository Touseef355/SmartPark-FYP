import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sps_backend.settings')
django.setup()

from django.db import connection

def fix_foreign_key():
    with connection.cursor() as cursor:
        print("Dropping constraint parking_sites_owner_id_fkey...")
        try:
            cursor.execute("ALTER TABLE public.parking_sites DROP CONSTRAINT IF EXISTS parking_sites_owner_id_fkey CASCADE;")
            print("Dropped constraint successfully.")
        except Exception as e:
            print(f"Error dropping constraint: {e}")
            
        print("Recreating constraint referencing public.users(id)...")
        try:
            cursor.execute("""
                ALTER TABLE public.parking_sites 
                ADD CONSTRAINT parking_sites_owner_id_fkey 
                FOREIGN KEY (owner_id) 
                REFERENCES public.users(id) 
                ON DELETE CASCADE;
            """)
            print("Recreated constraint pointing to public.users successfully!")
        except Exception as e:
            print(f"Error recreating constraint: {e}")

if __name__ == '__main__':
    fix_foreign_key()
