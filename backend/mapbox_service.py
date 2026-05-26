"""Mapbox Search Box (category) + Geocoding API helpers."""
from __future__ import annotations

from typing import Any

import requests

MAPBOX_SEARCHBOX_CATEGORY_URL = (
    'https://api.mapbox.com/search/searchbox/v1/category/{category}'
)
MAPBOX_GEOCODING_URL = (
    'https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json'
)

# Internal category id -> Mapbox Search Box canonical category id(s)
MAPBOX_CATEGORY_MAP: dict[str, list[str]] = {
    'restaurant': ['restaurant'],
    'grocery': ['grocery', 'supermarket'],
    'mall': ['shopping_mall'],
    'retail': ['store'],
    'car_wash': ['car_wash'],
    'mechanic': ['auto_repair'],
    'school': ['school'],
    'cafe': ['cafe'],
    'park': ['park'],
    'gym': ['fitness'],
    'movie_theater': ['cinema'],
    'gas': ['gas_station'],
    'pharmacy': ['pharmacy'],
    'library': ['library'],
    'atm': ['atm'],
    'ev_charging': ['electric_vehicle_charging_station'],
}

MAPBOX_HEADERS = {'User-Agent': 'Family-Housing-Hub/1.0 (mapbox)'}


def mapbox_category_ids(category: str) -> list[str]:
    return MAPBOX_CATEGORY_MAP.get(category, [category.replace('_', ' ')])


def _extract_image_url(props: dict[str, Any]) -> str:
    direct = (props.get('image_url') or '').strip()
    if direct.startswith('http'):
        return direct

    metadata = props.get('metadata') or {}
    photos = metadata.get('primary_photo') or []
    if isinstance(photos, list) and photos:
        best_url = ''
        best_width = -1
        for item in photos:
            if not isinstance(item, dict):
                continue
            url = (item.get('url') or '').strip()
            if not url.startswith('http'):
                continue
            width = int(item.get('width') or 0)
            if width >= best_width:
                best_width = width
                best_url = url
        if best_url:
            return best_url

    return ''


def _coords_from_feature(feature: dict[str, Any]) -> tuple[float | None, float | None]:
    props = feature.get('properties') or {}
    coords = props.get('coordinates') or {}
    if coords.get('latitude') is not None and coords.get('longitude') is not None:
        return float(coords['latitude']), float(coords['longitude'])

    geometry = feature.get('geometry') or {}
    if geometry.get('type') == 'Point':
        point = geometry.get('coordinates') or []
        if len(point) >= 2:
            return float(point[1]), float(point[0])

    center = feature.get('center')
    if isinstance(center, list) and len(center) >= 2:
        return float(center[1]), float(center[0])

    return None, None


def _address_from_props(props: dict[str, Any]) -> str:
    for key in ('full_address', 'place_name', 'description', 'address'):
        val = (props.get(key) or '').strip()
        if val:
            return val
    return ''


def _rating_from_props(props: dict[str, Any]) -> float:
    metadata = props.get('metadata') or {}
    for key in ('average_rating', 'rating'):
        val = metadata.get(key) if key in metadata else props.get(key)
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                pass
    return 0.0


def _phone_from_props(props: dict[str, Any]) -> str:
    metadata = props.get('metadata') or {}
    return str(metadata.get('phone') or props.get('phone') or '').strip()


def normalize_mapbox_feature(
    feature: dict[str, Any],
    *,
    category: str = '',
    origin_lat: float | None = None,
    origin_lng: float | None = None,
) -> dict[str, Any] | None:
    from location_services import _normalize_place, _infer_category_from_mapbox

    props = feature.get('properties') or {}
    lat, lng = _coords_from_feature(feature)
    if lat is None or lng is None:
        return None

    name = (
        props.get('name_preferred')
        or props.get('name')
        or props.get('feature_name')
        or props.get('matching_name')
        or feature.get('text')
        or ''
    ).strip()
    if not name:
        return None

    place_id = (
        props.get('mapbox_id')
        or props.get('id')
        or feature.get('id')
        or f'mapbox_{lat}_{lng}_{name}'
    )
    image_url = _extract_image_url(props)
    resolved_category = category or _infer_category_from_mapbox(props)

    place = _normalize_place(
        place_id=str(place_id),
        name=name,
        lat=lat,
        lng=lng,
        address=_address_from_props(props),
        rating=_rating_from_props(props),
        types=list(props.get('poi_category') or props.get('place_type') or []),
        category=resolved_category,
        phone=_phone_from_props(props),
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        source='mapbox',
        photo_url=image_url,
        image_url=image_url,
    )
    return place


def fetch_mapbox_category(
    category_id: str,
    lat: float,
    lng: float,
    access_token: str,
    *,
    limit: int = 20,
) -> list[dict[str, Any]]:
    url = MAPBOX_SEARCHBOX_CATEGORY_URL.format(category=requests.utils.quote(category_id, safe=''))
    response = requests.get(
        url,
        params={
            'proximity': f'{lng},{lat}',
            'limit': min(limit, 25),
            'access_token': access_token,
            'language': 'en',
        },
        headers=MAPBOX_HEADERS,
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    places: list[dict[str, Any]] = []
    for feature in data.get('features') or []:
        normalized = normalize_mapbox_feature(
            feature,
            origin_lat=lat,
            origin_lng=lng,
        )
        if normalized:
            places.append(normalized)
    return places


def fetch_mapbox_geocoding(
    query: str,
    access_token: str,
    *,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    url = MAPBOX_GEOCODING_URL.format(query=requests.utils.quote(query, safe=''))
    params: dict[str, Any] = {
        'access_token': access_token,
        'limit': min(limit, 20),
        'language': 'en',
        'types': 'poi,address,place',
    }
    if lat is not None and lng is not None:
        params['proximity'] = f'{lng},{lat}'

    response = requests.get(url, params=params, headers=MAPBOX_HEADERS, timeout=15)
    response.raise_for_status()
    data = response.json()
    places: list[dict[str, Any]] = []
    for feature in data.get('features') or []:
        normalized = normalize_mapbox_feature(
            feature,
            origin_lat=lat,
            origin_lng=lng,
        )
        if normalized:
            places.append(normalized)
    return places


def nearby_places_mapbox(
    lat: float,
    lng: float,
    categories: list[str],
    access_token: str,
    *,
    radius: int = 2000,
    limit_per_category: int = 20,
) -> list[dict[str, Any]]:
    from location_services import _filter_places_by_radius

    seen: set[str] = set()
    merged: list[dict[str, Any]] = []

    for category in categories:
        for mapbox_cat in mapbox_category_ids(category):
            try:
                batch = fetch_mapbox_category(
                    mapbox_cat,
                    lat,
                    lng,
                    access_token,
                    limit=limit_per_category,
                )
            except Exception:
                continue
            for place in batch:
                pid = place.get('id') or ''
                key = pid or f"{place.get('lat')}_{place.get('lng')}_{place.get('name')}"
                if key in seen:
                    continue
                seen.add(key)
                place['category'] = category
                merged.append(place)

    return _filter_places_by_radius(merged, lat, lng, radius)[:40]


def search_places_mapbox(
    query: str,
    access_token: str,
    *,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    return fetch_mapbox_geocoding(
        query,
        access_token,
        lat=lat,
        lng=lng,
        limit=limit,
    )[:limit]
