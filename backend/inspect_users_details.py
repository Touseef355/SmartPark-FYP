import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sps_backend.settings')
django.setup()

from django.db import connection

def inspect_users():
    with connection.cursor() as cursor:
        # Get table definition info
        print("Checking constraints on parking_sites:")
        cursor.execute("""
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'public.parking_sites'::regclass;
        """)
        for name, definition in cursor.fetchall():
            print(f"Constraint: {name} | Definition: {definition}")
            
        print("\nChecking triggers on public.users:")
        try:
            cursor.execute("""
                SELECT tgname, tgenabled, pg_get_triggerdef(oid) 
                FROM pg_trigger 
                WHERE tgrelid = 'public.users'::regclass;
            """)
            for name, enabled, definition in cursor.fetchall():
                print(f"Trigger: {name} | Enabled: {enabled} | Definition: {definition}")
        except Exception as e:
            print(f"Error checking triggers: {e}")

        print("\nChecking rules on public.users:")
        try:
            cursor.execute("""
                SELECT rulename, definition 
                FROM pg_rules 
                WHERE schemaname = 'public' AND tablename = 'users';
            """)
            for name, definition in cursor.fetchall():
                print(f"Rule: {name} | Definition: {definition}")
        except Exception as e:
            print(f"Error checking rules: {e}")

if __name__ == '__main__':
    inspect_users()
