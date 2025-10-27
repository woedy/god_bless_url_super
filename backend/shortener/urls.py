from django.urls import path

from .views import BulkCreateLinksView, LinkListView, LinkStatsView

urlpatterns = [
    path("links/", LinkListView.as_view(), name="link-list"),
    path("links/bulk/", BulkCreateLinksView.as_view(), name="link-bulk-create"),
    path("links/<slug:code>/stats/", LinkStatsView.as_view(), name="link-stats"),
]
