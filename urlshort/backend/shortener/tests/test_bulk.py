from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from shortener.models import Link

User = get_user_model()


class BulkCreateLinksTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_bulk_create_generates_expected_number_of_links(self):
        payload = {"url": "https://example.com", "size": 5, "code_length": 7}
        response = self.client.post(reverse("link-bulk-create"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(len(data["links"]), 5)
        codes = {item["code"] for item in data["links"]}
        self.assertEqual(len(codes), 5)
        self.assertEqual(Link.objects.filter(owner=self.user).count(), 5)

    def test_list_links_returns_only_user_links(self):
        Link.objects.create(owner=self.user, code="abc1234", target_url="https://djangoproject.com")
        other = User.objects.create_user(username="bob", password="password")
        Link.objects.create(owner=other, code="xyz9876", target_url="https://www.python.org")
        response = self.client.get(reverse("link-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["code"], "abc1234")
