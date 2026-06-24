from django.urls import path

from .views import (
    EntryView, ExitView, AiLogListView,
    AdminAiLogListView,
    ApproveEntryView, RejectEntryView,
    ApproveExitView, RejectExitView,
    PendingLogView, PendingExitView,
    CheckPlateView   
)

urlpatterns = [
    path('entry/',          EntryView.as_view(),         name='entry'),
    path('exit/',           ExitView.as_view(),           name='exit'),
    path('approve/',        ApproveEntryView.as_view(),   name='approve'),
    path('reject/',         RejectEntryView.as_view(),    name='reject'),
    path('approve-exit/',   ApproveExitView.as_view(),    name='approve-exit'),
    path('reject-exit/',    RejectExitView.as_view(),     name='reject-exit'),
    path('check-plate/',    CheckPlateView.as_view(),     name='check-plate'),  # <-- ADD
    path('logs/',           AiLogListView.as_view(),      name='ai-logs'),
    path('pending/',        PendingLogView.as_view(),     name='pending'),
    path('pending-exit/',   PendingExitView.as_view(),    name='pending-exit'),

    # ── Admin ──────────────────────────────────────────────────────────
    # GET /api/ai/admin/logs/
    # GET /api/ai/admin/logs/?event=entry&status=warning&search=LEF-1234
    # GET /api/ai/admin/logs/?date_from=2026-05-01&page=2
    path('admin/logs/',         AdminAiLogListView.as_view(),  name='admin-ai-logs'),
]