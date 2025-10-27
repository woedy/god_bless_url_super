from __future__ import annotations

import secrets
import string
from typing import Iterable, Iterator, Set, TypeVar

BASE62_ALPHABET = string.digits + string.ascii_letters
T = TypeVar("T")


def generate_code(length: int) -> str:
    if length <= 0:
        raise ValueError("length must be positive")
    return "".join(secrets.choice(BASE62_ALPHABET) for _ in range(length))


def batch_generate_codes(length: int, count: int) -> Set[str]:
    codes: Set[str] = set()
    while len(codes) < count:
        codes.add(generate_code(length))
    return codes


def chunked(iterable: Iterable[T], size: int) -> Iterator[list[T]]:
    chunk: list[T] = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) >= size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk
