from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import redis
from redis.exceptions import RedisError
from django.conf import settings


@dataclass
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after: Optional[int] = None


class RedisRateLimiter:
    def __init__(self, redis_url: str | None = None):
        self.redis_url = redis_url or settings.RATE_LIMIT_REDIS_URL
        self._client: redis.Redis | None = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.Redis.from_url(self.redis_url)
        return self._client

    def check(self, key: str, limit: int, period: int) -> RateLimitResult:
        now = int(time.time())
        window_key = f"rl:{key}:{now // period}"
        try:
            with self.client.pipeline() as pipe:
                pipe.incr(window_key)
                pipe.expire(window_key, period, nx=True)
                current, _ = pipe.execute()
        except RedisError:
            return RateLimitResult(allowed=True, remaining=limit)
        remaining = max(limit - current, 0)
        allowed = current <= limit
        retry_after = None
        if not allowed:
            retry_after = period - (now % period)
        return RateLimitResult(allowed=allowed, remaining=remaining, retry_after=retry_after)


rate_limiter = RedisRateLimiter()
