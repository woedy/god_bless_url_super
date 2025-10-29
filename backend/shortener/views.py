from __future__ import annotations

from typing import List

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import HttpResponseGone
from django.shortcuts import get_object_or_404, redirect
from rest_framework import generics, permissions, response, status, views

from .models import Link
from .serializers import BulkCreateRequestSerializer, LinkSerializer, LinkStatsSerializer
from .services import bulk_create_links, enforce_bulk_rate_limit

User = get_user_model()


def _client_ip(request) -> str:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class LinkListView(generics.ListAPIView):
    serializer_class = LinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Link.objects.filter(owner=self.request.user).order_by("-created_at")
        params = self.request.query_params
        target = params.get("target")
        if target:
            queryset = queryset.filter(target_url=target)
        query = params.get("q") or params.get("search")
        if query:
            queryset = queryset.filter(Q(target_url__icontains=query) | Q(code__icontains=query))
        return queryset


class LinkDetailView(generics.DestroyAPIView):
    serializer_class = LinkSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "code"

    def get_queryset(self):
        return Link.objects.filter(owner=self.request.user)


class BulkCreateLinksView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        enforce_bulk_rate_limit(_client_ip(request))
        serializer = BulkCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        owner = request.user if request.user.is_authenticated else None
        created_links, partial = bulk_create_links(
            owner=owner,
            target_url=data["url"],
            count=data["resolved_count"],
            code_length=data["resolved_code_length"],
            expires_at=data.get("expires_at"),
        )
        payload = {
            "links": LinkSerializer(created_links, many=True).data,
        }
        status_code = status.HTTP_201_CREATED
        if partial:
            payload["message"] = "Created fewer links than requested due to code collisions."
            status_code = status.HTTP_207_MULTI_STATUS
        return response.Response(payload, status=status_code)


class LinkStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, code: str):
        link = get_object_or_404(Link, code=code, owner=request.user)
        recent_clicks = list(link.clicks.all()[:50])
        stats = LinkStatsSerializer.from_link(link, recent_clicks)
        return response.Response(stats.data)


class RedirectView(views.APIView):
    permission_classes: List[type[permissions.BasePermission]] = [permissions.AllowAny]

    def get(self, request, code: str):
        link = get_object_or_404(Link, code=code)
        if not link.is_active:
            return HttpResponseGone("Link is inactive")
        if link.is_expired():
            return HttpResponseGone("Link has expired")
        link.mark_clicked(
            ip=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT"),
            referrer=request.META.get("HTTP_REFERER"),
        )
        return redirect(link.target_url)
