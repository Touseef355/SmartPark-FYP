import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sps_backend.settings')
django.setup()

from django.db import connection

def disable_rls_all_tables():
    with connection.cursor() as cursor:
        # Query tables in public schema and their RLS status
        cursor.execute("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public';
        """)
        tables = cursor.fetchall()
        
        print("Checking tables for Row Level Security (RLS):")
        print("-" * 50)
        
        for tablename, rls_enabled in tables:
            status = "ENABLED" if rls_enabled else "DISABLED"
            print(f"Table: {tablename:<30} | RLS: {status}")
            
            if rls_enabled:
                print(f"  --> Disabling RLS for {tablename}...")
                try:
                    cursor.execute(f'ALTER TABLE "{tablename}" DISABLE ROW LEVEL SECURITY;')
                    print(f"  [SUCCESS] Disabled RLS for table: {tablename}")
                except Exception as e:
                    print(f"  [ERROR] Failed to disable RLS for table {tablename}: {e}")
            
        print("-" * 50)
        print("RLS status update complete!")

if __name__ == '__main__':
    disable_rls_all_tables()
