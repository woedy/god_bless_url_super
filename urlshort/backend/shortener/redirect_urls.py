from django.urls import path

from .views import RedirectView

urlpatterns = [
    path("<slug:code>", RedirectView.as_view(), name="link-redirect"),
]
