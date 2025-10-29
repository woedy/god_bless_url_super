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

    def test_list_links_can_filter_by_exact_target(self):
        match = Link.objects.create(owner=self.user, code="abc1234", target_url="https://example.com/a")
        Link.objects.create(owner=self.user, code="zzz9999", target_url="https://another.com/page")
        response = self.client.get(reverse("link-list"), {"target": match.target_url})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["code"], match.code)

    def test_list_links_searches_code_and_target(self):
        Link.objects.create(owner=self.user, code="match12", target_url="https://example.com/landing")
        Link.objects.create(owner=self.user, code="other90", target_url="https://different.com/page")
        response = self.client.get(reverse("link-list"), {"q": "landing"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["code"], "match12")

        response = self.client.get(reverse("link-list"), {"search": "other"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

    def test_delete_link_removes_owned_link(self):
        link = Link.objects.create(
            owner=self.user,
            code="delete12",
            target_url="https://example.com/to-remove",
        )

        response = self.client.delete(reverse("link-detail", kwargs={"code": link.code}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Link.objects.filter(pk=link.pk).exists())

    def test_delete_link_for_other_user_returns_not_found(self):
        other = User.objects.create_user(username="carol", password="password")
        link = Link.objects.create(owner=other, code="keep123", target_url="https://example.com/keep")

        response = self.client.delete(reverse("link-detail", kwargs={"code": link.code}))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Link.objects.filter(pk=link.pk).exists())
