from django.test import TestCase
from django.utils import timezone

from shortener.models import Link


class RedirectViewTests(TestCase):
    def setUp(self):
        self.link = Link.objects.create(code="abc1234", target_url="https://example.com")

    def test_redirect_increments_click_count(self):
        response = self.client.get(f"/{self.link.code}")
        self.assertEqual(response.status_code, 302)
        refreshed = Link.objects.get(pk=self.link.pk)
        self.assertEqual(refreshed.click_count, 1)
        self.assertEqual(refreshed.clicks.count(), 1)

    def test_expired_link_returns_gone(self):
        self.link.expires_at = timezone.now() - timezone.timedelta(days=1)
        self.link.save()
        response = self.client.get(f"/{self.link.code}")
        self.assertEqual(response.status_code, 410)

    def test_inactive_link_returns_gone(self):
        self.link.is_active = False
        self.link.save()
        response = self.client.get(f"/{self.link.code}")
        self.assertEqual(response.status_code, 410)
