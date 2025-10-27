from __future__ import annotations

from typing import Iterable, List, Sequence, Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import exceptions

from .models import Link
from .throttling import rate_limiter
from .utils import batch_generate_codes

User = get_user_model()


def enforce_bulk_rate_limit(ip_address: str) -> None:
    result = rate_limiter.check(
        key=f"bulk:{ip_address}",
        limit=settings.BULK_RATE_LIMIT,
        period=settings.BULK_RATE_PERIOD_SECONDS,
    )
    if not result.allowed:
        raise exceptions.Throttled(detail="Rate limit exceeded", wait=result.retry_after or settings.BULK_RATE_PERIOD_SECONDS)


def bulk_create_links(
    *,
    owner: User | None,
    target_url: str,
    count: int,
    code_length: int,
    expires_at,
) -> Tuple[List[Link], bool]:
    created: List[Link] = []
    attempts = 0
    max_attempts = 5
    desired_total = count
    while len(created) < desired_total and attempts < max_attempts:
        attempts += 1
        remaining = desired_total - len(created)
        candidate_count = max(remaining * 2, remaining)
        candidates = batch_generate_codes(code_length, candidate_count)
        existing_codes = set(Link.objects.filter(code__in=candidates).values_list("code", flat=True))
        available_codes = list(candidates - existing_codes)
        if not available_codes:
            continue
        selected_codes = available_codes[:remaining]
        new_links = [
            Link(owner=owner, code=code, target_url=target_url, expires_at=expires_at)
            for code in selected_codes
        ]
        for link in new_links:
            link.clean()
        with transaction.atomic():
            saved_links = Link.objects.bulk_create(new_links, batch_size=500)
        created.extend(saved_links)
    partial = len(created) < desired_total
    return created, partial
