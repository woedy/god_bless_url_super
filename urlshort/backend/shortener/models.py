from __future__ import annotations

from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models
from django.utils import timezone

from .utils import generate_code

User = get_user_model()


class Link(models.Model):
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    code = models.SlugField(max_length=16, unique=True, db_index=True)
    target_url = models.TextField()
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    click_count = models.PositiveIntegerField(default=0)

    _desired_length: int | None = None

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:  # pragma: no cover - debug aid
        return self.code

    def clean(self) -> None:
        parsed = urlparse(self.target_url)
        if not parsed.scheme:
            raise ValidationError("URL must include a scheme (http or https).")
        scheme = parsed.scheme.lower()
        if scheme not in settings.ALLOWED_URL_SCHEMES:
            raise ValidationError("Only http and https URLs are allowed.")
        if scheme in settings.DENYLIST_SCHEMES:
            raise ValidationError("This URL scheme is not allowed.")

    def save(self, *args, **kwargs):
        if not self.code:
            length = self._desired_length or settings.DEFAULT_CODE_LENGTH
            if not settings.MIN_CODE_LENGTH <= length <= settings.MAX_CODE_LENGTH:
                raise ValidationError("Invalid code length requested.")
            self.code = self._generate_unique_code(length)
        super().save(*args, **kwargs)

    def _generate_unique_code(self, length: int) -> str:
        for attempt in range(10):
            candidate = generate_code(length)
            if not Link.objects.filter(code=candidate).exists():
                return candidate
        raise IntegrityError("Could not generate unique code after multiple attempts")

    def mark_clicked(self, ip: str | None, user_agent: str | None, referrer: str | None, country: str | None = None) -> None:
        Click.objects.create(
            link=self,
            ip=ip,
            user_agent=user_agent,
            referrer=referrer,
            country=country,
        )
        Link.objects.filter(pk=self.pk).update(click_count=models.F("click_count") + 1)
        self.refresh_from_db(fields=["click_count"])

    @property
    def short_url(self) -> str:
        return f"{settings.REDIRECT_BASE_URL.rstrip('/')}/{self.code}"

    def is_expired(self) -> bool:
        return bool(self.expires_at and timezone.now() >= self.expires_at)


class Click(models.Model):
    link = models.ForeignKey(Link, on_delete=models.CASCADE, related_name="clicks")
    ts = models.DateTimeField(auto_now_add=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    referrer = models.TextField(null=True, blank=True)
    country = models.CharField(max_length=2, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["link", "ts"]),
        ]
        ordering = ("-ts",)

    def __str__(self) -> str:  # pragma: no cover
        return f"Click({self.link_id})"
