import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack  
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sps_backend.settings")
django.setup()

from ai_module.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),

    # AuthMiddlewareStack required to attach user/session info
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})