"""Nominatim helpers with 1 request/second rate limiting."""
from __future__ import annotations

import threading
import time
from typing import Any

import requests

from location_services import (
    CATEGORY_DEFS,
    NOMINATIM_HEADERS,
    NOMINATIM_URL,
    _infer_category_from_osm,
    _normalize_place,
    _osm_phone_hours,
    get_placeholder_by_category,
)

_rate_lock = threading.Lock()
_last_request_at = 0.0


def _rate_limited_get(params: dict[str, Any], *, timeout: int = 12) -> requests.Response:
    global _last_request_at
    with _rate_lock:
        elapsed = time.monotonic() - _last_request_at
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        response = requests.get(
            NOMINATIM_URL,
            params=params,
            headers=NOMINATIM_HEADERS,
            timeout=timeout,
        )
        _last_request_at = time.monotonic()
        return response


def _normalize_nominatim_row(
    row: dict[str, Any],
    *,
    category: str = '',
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    index: int = 0,
) -> dict[str, Any] | None:
    try:
        lat = float(row['lat'])
        lng = float(row['lon'])
    except (KeyError, TypeError, ValueError):
        return None

    address = row.get('display_name', '')
    name = row.get('name') or (address.split(',')[0] if address else 'Unnamed place')
    if not name or name == 'Unnamed place':
        return None

    extra = row.get('extratags') or {}
    tags: dict[str, str] = dict(extra) if isinstance(extra, dict) else {}
    osm_class = row.get('class')
    osm_type = row.get('type')
    if osm_class and osm_type:
        tags.setdefault(str(osm_class), str(osm_type))
    inferred = category or _infer_category_from_osm(tags)
    phone, hours = _osm_phone_hours(extra if isinstance(extra, dict) else {})
    placeholder = get_placeholder_by_category(category or inferred)

    return _normalize_place(
        place_id=f"nominatim_{row.get('osm_type', 'node')}_{row.get('osm_id', index)}",
        name=name,
        lat=lat,
        lng=lng,
        address=address,
        types=[row.get('type', 'place')],
        category=category or inferred,
        phone=phone,
        hours=hours,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        source='nominatim',
        photo_url=placeholder,
        image_url=placeholder,
    )


def nearby_nominatim(
    category: str,
    lat: float,
    lng: float,
    *,
    limit: int = 20,
    country_code: str = 'us',
) -> list[dict[str, Any]]:
    label = CATEGORY_DEFS.get(category, {}).get('label', category.replace('_', ' '))
    query = f'{label} near {lat},{lng}'
    response = _rate_limited_get(
        {
            'q': query,
            'format': 'json',
            'limit': limit,
            'addressdetails': 1,
            'extratags': 1,
            'countrycodes': country_code.lower(),
        }
    )
    response.raise_for_status()
    places: list[dict[str, Any]] = []
    for i, row in enumerate(response.json()):
        normalized = _normalize_nominatim_row(
            row,
            category=category,
            origin_lat=lat,
            origin_lng=lng,
            index=i,
        )
        if normalized:
            places.append(normalized)
    return places


def search_nominatim_proximity(
    query: str,
    *,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = 20,
    country_code: str = 'us',
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {
        'q': query,
        'format': 'json',
        'limit': limit,
        'addressdetails': 1,
        'extratags': 1,
        'countrycodes': country_code.lower(),
    }
    if lat is not None and lng is not None:
        params['q'] = f'{query} near {lat},{lng}'

    response = _rate_limited_get(params)
    response.raise_for_status()
    places: list[dict[str, Any]] = []
    for i, row in enumerate(response.json()):
        normalized = _normalize_nominatim_row(
            row,
            origin_lat=lat,
            origin_lng=lng,
            index=i,
        )
        if normalized:
            places.append(normalized)
    return places


def merge_unique_places(
    primary: list[dict[str, Any]],
    backup: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged = list(primary)
    seen = {
        (round(p.get('lat', 0), 4), round(p.get('lng', 0), 4), (p.get('name') or '').lower())
        for p in primary
    }
    for place in backup:
        key = (
            round(place.get('lat', 0), 4),
            round(place.get('lng', 0), 4),
            (place.get('name') or '').lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        merged.append(place)
    if merged and merged[0].get('distance') is not None:
        merged.sort(key=lambda p: p.get('distance', 999))
    return merged
