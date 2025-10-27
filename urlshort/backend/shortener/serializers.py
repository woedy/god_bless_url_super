from __future__ import annotations

from typing import Iterable

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from .models import Click, Link


class LinkSerializer(serializers.ModelSerializer):
    short_url = serializers.SerializerMethodField()

    class Meta:
        model = Link
        fields = [
            "id",
            "code",
            "short_url",
            "target_url",
            "is_active",
            "expires_at",
            "click_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "code", "short_url", "click_count", "created_at", "updated_at"]

    def get_short_url(self, obj: Link) -> str:
        return obj.short_url


class BulkCreateRequestSerializer(serializers.Serializer):
    url = serializers.URLField()
    size = serializers.IntegerField(required=False, min_value=1, max_value=settings.MAX_BULK_LINKS)
    count = serializers.IntegerField(required=False, min_value=1, max_value=settings.MAX_BULK_LINKS)
    code_length = serializers.IntegerField(required=False)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        size = attrs.get("size")
        count = attrs.get("count")
        resolved_count = count or size or 1
        if resolved_count > settings.MAX_BULK_LINKS:
            raise serializers.ValidationError(
                {"size": f"Cannot generate more than {settings.MAX_BULK_LINKS} links per request."}
            )
        attrs["resolved_count"] = resolved_count
        code_length = attrs.get("code_length") or settings.DEFAULT_CODE_LENGTH
        if not settings.MIN_CODE_LENGTH <= code_length <= settings.MAX_CODE_LENGTH:
            raise serializers.ValidationError(
                {"code_length": f"Code length must be between {settings.MIN_CODE_LENGTH} and {settings.MAX_CODE_LENGTH}."}
            )
        attrs["resolved_code_length"] = code_length
        expires_at = attrs.get("expires_at")
        if expires_at and expires_at <= timezone.now():
            raise serializers.ValidationError({"expires_at": "Expiration must be in the future."})
        return attrs


class ClickSerializer(serializers.ModelSerializer):
    class Meta:
        model = Click
        fields = ["ts", "ip", "user_agent", "referrer", "country"]


class LinkStatsSerializer(serializers.Serializer):
    link = LinkSerializer()
    total_clicks = serializers.IntegerField()
    recent_clicks = ClickSerializer(many=True)

    @classmethod
    def from_link(cls, link: Link, clicks: Iterable[Click]) -> "LinkStatsSerializer":
        return cls(
            {
                "link": LinkSerializer(link).data,
                "total_clicks": link.click_count,
                "recent_clicks": ClickSerializer(clicks, many=True).data,
            }
        )
