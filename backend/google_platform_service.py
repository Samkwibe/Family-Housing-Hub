"""Google Maps Platform extras — geocoding, routes, street view, pollen, solar, timezone."""

from __future__ import annotations

import time
from typing import Any

import requests

ROUTES_BASE = 'https://routes.googleapis.com/directions/v2'
MAPS_BASE = 'https://maps.googleapis.com/maps/api'
POLLEN_BASE = 'https://pollen.googleapis.com/v1'
SOLAR_BASE = 'https://solar.googleapis.com/v1'


def geocode_google(address: str, api_key: str) -> dict[str, Any] | None:
    if not address.strip() or not api_key:
        return None
    response = requests.get(
        f'{MAPS_BASE}/geocode/json',
        params={'address': address.strip(), 'key': api_key},
        timeout=12,
    )
    response.raise_for_status()
    data = response.json()
    if data.get('status') != 'OK' or not data.get('results'):
        return None
    top = data['results'][0]
    loc = top.get('geometry', {}).get('location', {})
    return {
        'lat': loc.get('lat'),
        'lng': loc.get('lng'),
        'display_name': top.get('formatted_address') or address.strip(),
        'provider': 'google',
    }


def timezone_google(lat: float, lng: float, api_key: str) -> dict[str, Any] | None:
    response = requests.get(
        f'{MAPS_BASE}/timezone/json',
        params={'location': f'{lat},{lng}', 'timestamp': int(time.time()), 'key': api_key},
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    if data.get('status') != 'OK':
        return None
    return {
        'timeZoneId': data.get('timeZoneId'),
        'timeZoneName': data.get('timeZoneName'),
        'rawOffset': data.get('rawOffset'),
        'dstOffset': data.get('dstOffset'),
    }


def street_view_available(lat: float, lng: float, api_key: str) -> bool:
    response = requests.get(
        f'{MAPS_BASE}/streetview/metadata',
        params={'location': f'{lat},{lng}', 'key': api_key},
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    return data.get('status') == 'OK'


def build_street_view_url(lat: float, lng: float, api_key: str, width: int = 640, height: int = 400) -> str:
    return (
        f'{MAPS_BASE}/streetview'
        f'?size={width}x{height}&location={lat},{lng}&key={api_key}'
    )


def fetch_street_view_image(lat: float, lng: float, api_key: str, width: int = 640, height: int = 400) -> tuple[bytes, str] | None:
    if not street_view_available(lat, lng, api_key):
        return None
    url = build_street_view_url(lat, lng, api_key, width, height)
    response = requests.get(url, timeout=15)
    if response.status_code != 200:
        return None
    content_type = response.headers.get('Content-Type', 'image/jpeg')
    return response.content, content_type


def _format_duration(seconds: int | float | None) -> str | None:
    if seconds is None:
        return None
    total = int(seconds)
    if total < 60:
        return f'{total} sec'
    minutes = total // 60
    if minutes < 60:
        return f'{minutes} min'
    hours = minutes // 60
    rem = minutes % 60
    return f'{hours} hr {rem} min' if rem else f'{hours} hr'


def compute_travel_times(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    api_key: str,
) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for mode in ('DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'):
        try:
            response = requests.post(
                f'{ROUTES_BASE}:computeRoutes',
                headers={
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': api_key,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
                },
                json={
                    'origin': {'location': {'latLng': {'latitude': origin_lat, 'longitude': origin_lng}}},
                    'destination': {'location': {'latLng': {'latitude': dest_lat, 'longitude': dest_lng}}},
                    'travelMode': mode,
                    'routingPreference': 'TRAFFIC_AWARE' if mode == 'DRIVE' else 'ROUTING_PREFERENCE_UNSPECIFIED',
                },
                timeout=12,
            )
            if response.status_code != 200:
                continue
            routes = response.json().get('routes') or []
            if not routes:
                continue
            route = routes[0]
            duration_raw = route.get('duration', '0s')
            if isinstance(duration_raw, str) and duration_raw.endswith('s'):
                seconds = int(duration_raw[:-1] or 0)
            else:
                seconds = int(duration_raw) if duration_raw else 0
            key = mode.lower()
            out[key] = {
                'seconds': seconds,
                'label': _format_duration(seconds),
                'distanceMeters': route.get('distanceMeters'),
            }
        except Exception:
            continue
    return out


def pollen_forecast(lat: float, lng: float, api_key: str, days: int = 1) -> dict[str, Any] | None:
    response = requests.get(
        f'{POLLEN_BASE}/forecast:lookup',
        params={
            'key': api_key,
            'location.latitude': lat,
            'location.longitude': lng,
            'days': min(max(days, 1), 5),
        },
        timeout=12,
    )
    if response.status_code != 200:
        return None
    data = response.json()
    daily = (data.get('dailyInfo') or data.get('daily_info') or [])[:days]
    if not daily:
        return {'days': [], 'provider': 'google'}
    normalized = []
    for day in daily:
        pollen_type = day.get('pollenTypeInfo') or day.get('pollen_type_info') or []
        types = []
        for pt in pollen_type[:4]:
            index = pt.get('indexInfo') or pt.get('index_info') or {}
            types.append({
                'type': pt.get('code') or pt.get('displayName') or pt.get('display_name') or 'Pollen',
                'value': index.get('value'),
                'category': index.get('category'),
                'description': (index.get('description') or {}).get('text')
                if isinstance(index.get('description'), dict)
                else index.get('description'),
            })
        normalized.append({'date': day.get('date'), 'types': types})
    return {'days': normalized, 'provider': 'google'}


def solar_insights(lat: float, lng: float, api_key: str) -> dict[str, Any] | None:
    response = requests.get(
        f'{SOLAR_BASE}/buildingInsights:findClosest',
        params={
            'location.latitude': lat,
            'location.longitude': lng,
            'requiredQuality': 'HIGH',
            'key': api_key,
        },
        timeout=15,
    )
    if response.status_code != 200:
        return None
    data = response.json()
    potential = data.get('solarPotential') or data.get('solar_potential') or {}
    financial = potential.get('financialAnalyses') or potential.get('financial_analyses') or []
    panel = potential.get('maxArrayPanelsCount') or potential.get('max_array_panels_count')
    yearly = potential.get('maxSunshineHoursPerYear') or potential.get('max_sunshine_hours_per_year')
    savings = None
    if financial and isinstance(financial[0], dict):
        savings = financial[0].get('savings') or financial[0].get('monthlyBill') or financial[0].get('monthly_bill')
    return {
        'provider': 'google',
        'maxPanels': panel,
        'sunshineHoursPerYear': yearly,
        'imageryDate': (data.get('imageryDate') or data.get('imagery_date')),
        'savingsHint': savings,
        'center': data.get('center'),
    }


def place_insights(
    dest_lat: float,
    dest_lng: float,
    api_key: str,
    *,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    include_solar: bool = False,
) -> dict[str, Any]:
    result: dict[str, Any] = {'provider': 'google', 'location': {'lat': dest_lat, 'lng': dest_lng}}

    try:
        tz = timezone_google(dest_lat, dest_lng, api_key)
        if tz:
            result['timezone'] = tz
    except Exception:
        pass

    try:
        result['streetViewAvailable'] = street_view_available(dest_lat, dest_lng, api_key)
    except Exception:
        result['streetViewAvailable'] = False

    if origin_lat is not None and origin_lng is not None:
        try:
            result['travel'] = compute_travel_times(origin_lat, origin_lng, dest_lat, dest_lng, api_key)
        except Exception:
            result['travel'] = {}

    if include_solar:
        try:
            solar = solar_insights(dest_lat, dest_lng, api_key)
            if solar:
                result['solar'] = solar
        except Exception:
            pass

    return result
