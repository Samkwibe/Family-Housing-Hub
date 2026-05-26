"""Location helpers: Mapbox primary, Nominatim backup, Google/OSM fallbacks."""
from __future__ import annotations

import math
from typing import Any

import requests

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
NOMINATIM_HEADERS = {'User-Agent': 'Family-Housing-Hub/1.0 (maps)'}

# Category definitions: OSM tags, Google Places type, display label
CATEGORY_DEFS: dict[str, dict[str, Any]] = {
    'grocery': {
        'label': 'Grocery',
        'google_type': 'supermarket',
        'group': 'default',
        'osm': [
            ('shop', 'supermarket'),
            ('shop', 'convenience'),
            ('shop', 'grocery'),
            ('amenity', 'marketplace'),
        ],
    },
    'mall': {
        'label': 'Malls',
        'google_type': 'shopping_mall',
        'group': 'default',
        'osm': [('shop', 'mall')],
    },
    'retail': {
        'label': 'Retail',
        'google_type': 'store',
        'group': 'default',
        'osm': [
            ('shop', 'clothes'),
            ('shop', 'department_store'),
            ('shop', 'general'),
            ('shop', 'variety_store'),
            ('shop', 'electronics'),
            ('shop', 'hardware'),
        ],
    },
    'restaurant': {
        'label': 'Restaurants',
        'google_type': 'restaurant',
        'group': 'default',
        'osm': [
            ('amenity', 'restaurant'),
            ('amenity', 'fast_food'),
        ],
    },
    'car_wash': {
        'label': 'Car Wash',
        'google_type': 'car_wash',
        'group': 'default',
        'osm': [('amenity', 'car_wash')],
    },
    'mechanic': {
        'label': 'Mechanic',
        'google_type': 'car_repair',
        'group': 'default',
        'osm': [
            ('shop', 'car_repair'),
            ('craft', 'car_repair'),
            ('amenity', 'car_repair'),
        ],
    },
    'school': {
        'label': 'Schools',
        'google_type': 'school',
        'group': 'default',
        'osm': [
            ('amenity', 'school'),
            ('amenity', 'university'),
            ('amenity', 'college'),
            ('amenity', 'kindergarten'),
        ],
    },
    'cafe': {
        'label': 'Cafes',
        'google_type': 'cafe',
        'group': 'default',
        'osm': [('amenity', 'cafe')],
    },
    'gas': {
        'label': 'Gas',
        'google_type': 'gas_station',
        'group': 'default',
        'osm': [('amenity', 'fuel')],
    },
    'pharmacy': {
        'label': 'Pharmacy',
        'google_type': 'pharmacy',
        'group': 'default',
        'osm': [
            ('amenity', 'pharmacy'),
            ('shop', 'chemist'),
        ],
    },
    'park': {
        'label': 'Parks',
        'google_type': 'park',
        'group': 'explore',
        'osm': [
            ('leisure', 'park'),
            ('leisure', 'garden'),
            ('leisure', 'nature_reserve'),
        ],
    },
    'library': {
        'label': 'Libraries',
        'google_type': 'library',
        'group': 'explore',
        'osm': [('amenity', 'library')],
    },
    'gym': {
        'label': 'Gyms',
        'google_type': 'gym',
        'group': 'explore',
        'osm': [
            ('leisure', 'fitness_centre'),
            ('leisure', 'sports_centre'),
        ],
    },
    'movie_theater': {
        'label': 'Movies',
        'google_type': 'movie_theater',
        'group': 'explore',
        'osm': [('amenity', 'cinema')],
    },
    'atm': {
        'label': 'ATMs',
        'google_type': 'atm',
        'group': 'explore',
        'osm': [('amenity', 'atm')],
    },
    'ev_charging': {
        'label': 'EV Charging',
        'google_type': 'electric_vehicle_charging_station',
        'group': 'explore',
        'osm': [('amenity', 'charging_station')],
    },
}

DEFAULT_CATEGORIES = [k for k, v in CATEGORY_DEFS.items() if v.get('group') == 'default']
EXPLORE_CATEGORIES = [k for k, v in CATEGORY_DEFS.items() if v.get('group') == 'explore']
ALL_CATEGORIES = list(CATEGORY_DEFS.keys())

# Legacy alias
CATEGORY_OSM_FILTERS: dict[str, list[tuple[str, str]]] = {
    k: v['osm'] for k, v in CATEGORY_DEFS.items()
}

GOOGLE_TYPE_MAP: dict[str, str] = {
    k: v['google_type'] for k, v in CATEGORY_DEFS.items()
}

# Quick autocomplete keywords mapped to categories
SEARCH_SUGGESTIONS: list[dict[str, str]] = [
    {'q': 'pizza', 'category': 'restaurant'},
    {'q': 'car repair', 'category': 'mechanic'},
    {'q': 'car wash', 'category': 'car_wash'},
    {'q': 'grocery store', 'category': 'grocery'},
    {'q': 'coffee', 'category': 'cafe'},
    {'q': 'gas station', 'category': 'gas'},
    {'q': 'pharmacy', 'category': 'pharmacy'},
    {'q': 'shopping mall', 'category': 'mall'},
    {'q': 'school', 'category': 'school'},
    {'q': 'gym', 'category': 'gym'},
    {'q': 'library', 'category': 'library'},
    {'q': 'movie theater', 'category': 'movie_theater'},
    {'q': 'ATM', 'category': 'atm'},
    {'q': 'EV charging', 'category': 'ev_charging'},
    {'q': 'park', 'category': 'park'},
]


NEARBY_RADIUS_DEFAULT_M = 2000
SEARCH_RADIUS_M = 30000
MIN_RESULTS_BEFORE_NOMINATIM = 3

# Empty placeholder — mobile shows category icon when image_url/photoUrl is blank.
CATEGORY_PLACEHOLDER_URL = ''


def get_placeholder_by_category(category: str) -> str:
    return CATEGORY_PLACEHOLDER_URL


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _google_photo_reference(place: dict[str, Any]) -> str:
    photos = place.get('photos') or []
    if photos and isinstance(photos[0], dict):
        return photos[0].get('photo_reference') or ''
    return ''


def build_google_photo_url(photo_reference: str, api_key: str, maxwidth: int = 400) -> str:
    if not photo_reference or not api_key:
        return ''
    return (
        f'https://maps.googleapis.com/maps/api/place/photo'
        f'?maxwidth={maxwidth}&photoreference={photo_reference}&key={api_key}'
    )


def _osm_image_url(tags: dict[str, str]) -> str:
    for key in ('image', 'image:url', 'wikimedia_commons:image'):
        val = (tags.get(key) or '').strip()
        if val.startswith('http://') or val.startswith('https://'):
            return val
    commons = (tags.get('wikimedia_commons') or '').strip()
    if commons.startswith('File:'):
        filename = commons[5:].replace(' ', '_')
        return f'https://commons.wikimedia.org/wiki/Special:FilePath/{filename}'
    return ''


def _filter_places_by_radius(
    places: list[dict[str, Any]],
    origin_lat: float,
    origin_lng: float,
    radius_m: int,
) -> list[dict[str, Any]]:
    max_km = radius_m / 1000.0
    filtered: list[dict[str, Any]] = []
    for place in places:
        lat = place.get('lat')
        lng = place.get('lng')
        if lat is None or lng is None:
            continue
        dist = place.get('distance')
        if dist is None:
            dist = haversine_km(origin_lat, origin_lng, float(lat), float(lng))
            place['distance'] = round(dist, 2)
        if dist <= max_km:
            filtered.append(place)
    filtered.sort(key=lambda p: p.get('distance', 999))
    return filtered


def _normalize_place(
    *,
    place_id: str,
    name: str,
    lat: float,
    lng: float,
    address: str = '',
    rating: float = 0,
    types: list[str] | None = None,
    category: str = '',
    phone: str = '',
    hours: str = '',
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    source: str = 'osm',
    photo_reference: str = '',
    photo_url: str = '',
    image_url: str = '',
) -> dict[str, Any]:
    resolved_image = image_url or photo_url
    out: dict[str, Any] = {
        'id': place_id,
        'name': name or 'Unnamed place',
        'address': address,
        'lat': lat,
        'lng': lng,
        'rating': rating,
        'types': types or [],
        'category': category,
        'phone': phone,
        'hours': hours,
        'source': source,
    }
    if photo_reference:
        out['photoReference'] = photo_reference
    if resolved_image:
        out['photoUrl'] = resolved_image
        out['image_url'] = resolved_image
    if origin_lat is not None and origin_lng is not None:
        out['distance'] = round(haversine_km(origin_lat, origin_lng, lat, lng), 2)
    return out


def _infer_category_from_osm(tags: dict[str, str]) -> str:
    for cat, defn in CATEGORY_DEFS.items():
        for key, value in defn['osm']:
            if tags.get(key) == value:
                return cat
    for key in ('amenity', 'shop', 'leisure', 'tourism', 'craft'):
        if tags.get(key):
            return tags[key]
    return 'other'


def _infer_category_from_mapbox(props: dict[str, Any]) -> str:
    poi_ids = props.get('poi_category_ids') or props.get('poi_category') or []
    if isinstance(poi_ids, str):
        poi_ids = [poi_ids]
    poi_set = {str(x).lower().replace(' ', '_') for x in poi_ids}

    from mapbox_service import MAPBOX_CATEGORY_MAP

    for cat, mapbox_ids in MAPBOX_CATEGORY_MAP.items():
        for mid in mapbox_ids:
            if mid.lower() in poi_set or mid.lower().replace('_', ' ') in poi_set:
                return cat

    maki = (props.get('maki') or '').lower()
    for cat, defn in CATEGORY_DEFS.items():
        if defn.get('google_type') == maki:
            return cat
    return 'other'


def _infer_category_from_google(types: list[str]) -> str:
    type_set = set(types or [])
    for cat, defn in CATEGORY_DEFS.items():
        gtype = defn.get('google_type', '')
        if gtype in type_set:
            return cat
    for gtype in types or []:
        for cat, defn in CATEGORY_DEFS.items():
            if defn.get('google_type') == gtype:
                return cat
    return 'other'


def _osm_phone_hours(tags: dict[str, str]) -> tuple[str, str]:
    phone = tags.get('phone') or tags.get('contact:phone') or tags.get('telephone') or ''
    hours = tags.get('opening_hours') or tags.get('opening_hours:covid19') or ''
    return phone, hours


def geocode_nominatim(address: str, *, country_code: str = 'us') -> dict[str, Any] | None:
    from nominatim_service import _rate_limited_get

    response = _rate_limited_get(
        {
            'q': address,
            'format': 'json',
            'limit': 1,
            'addressdetails': 1,
            'countrycodes': country_code.lower(),
        }
    )
    response.raise_for_status()
    results = response.json()
    if not results:
        return None
    row = results[0]
    return {
        'lat': float(row['lat']),
        'lng': float(row['lon']),
        'display_name': row.get('display_name', address),
        'address': row.get('address', {}),
    }


def search_nominatim(
    query: str,
    limit: int = 10,
    *,
    country_code: str = 'us',
) -> list[dict[str, Any]]:
    from nominatim_service import search_nominatim_proximity

    return search_nominatim_proximity(query, limit=limit, country_code=country_code)


def autocomplete_suggestions(
    query: str,
    limit: int = 8,
    *,
    mapbox_access_token: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    country_code: str = 'us',
) -> list[dict[str, Any]]:
    """Fast local + Mapbox/Nominatim suggestions for search-as-you-type."""
    q = (query or '').strip().lower()
    if not q:
        return []

    suggestions: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in SEARCH_SUGGESTIONS:
        text = item['q']
        if q in text.lower() and text.lower() not in seen:
            seen.add(text.lower())
            suggestions.append({
                'id': f"suggest_{text}",
                'name': text,
                'category': item.get('category', ''),
                'type': 'keyword',
            })
        if len(suggestions) >= limit:
            return suggestions[:limit]

    remote: list[dict[str, Any]] = []
    if mapbox_access_token:
        try:
            from mapbox_service import search_places_mapbox

            remote = search_places_mapbox(
                query,
                mapbox_access_token,
                lat=lat,
                lng=lng,
                limit=max(1, limit - len(suggestions)),
            )
        except Exception:
            remote = []

    if len(remote) < MIN_RESULTS_BEFORE_NOMINATIM:
        try:
            nominatim = search_nominatim(
                query,
                limit=max(1, limit - len(suggestions)),
                country_code=country_code,
            )
            remote = nominatim if not remote else remote + nominatim
        except Exception:
            pass

    for place in remote:
        key = (place.get('name') or '').lower()
        if key in seen:
            continue
        seen.add(key)
        suggestions.append({
            'id': place.get('id', key),
            'name': place.get('name', query),
            'address': place.get('address', ''),
            'lat': place.get('lat'),
            'lng': place.get('lng'),
            'type': 'place',
        })
        if len(suggestions) >= limit:
            break

    return suggestions[:limit]


def search_google_places(
    query: str,
    api_key: str,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = 15,
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {'query': query, 'key': api_key}
    if lat is not None and lng is not None:
        params['location'] = f'{lat},{lng}'
        params['radius'] = 50000
    response = requests.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        params=params,
        timeout=12,
    )
    data = response.json()
    if data.get('status') not in ('OK', 'ZERO_RESULTS'):
        raise RuntimeError(data.get('error_message') or data.get('status') or 'Places search failed')
    places = []
    for place in data.get('results', [])[:limit]:
        loc = place.get('geometry', {}).get('location', {})
        types = place.get('types', [])
        photo_ref = _google_photo_reference(place)
        places.append(
            _normalize_place(
                place_id=place.get('place_id', ''),
                name=place.get('name', ''),
                lat=loc.get('lat', 0),
                lng=loc.get('lng', 0),
                address=place.get('formatted_address', place.get('vicinity', '')),
                rating=place.get('rating', 0) or 0,
                types=types,
                category=_infer_category_from_google(types),
                origin_lat=lat,
                origin_lng=lng,
                source='google',
                photo_reference=photo_ref,
                photo_url=build_google_photo_url(photo_ref, api_key) if photo_ref else '',
            )
        )
    return places


def search_places(
    query: str,
    *,
    mapbox_access_token: str | None = None,
    google_api_key: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = 10,
    country_code: str = 'us',
) -> tuple[list[dict[str, Any]], str]:
    q = (query or '').strip()
    if not q:
        return [], 'none'

    # Google first for text search — richer photos, ratings, and POI names
    if google_api_key:
        try:
            google_results = search_google_places(q, google_api_key, lat, lng, limit=limit)
            if google_results:
                if lat is not None and lng is not None:
                    filtered = _filter_places_by_radius(
                        google_results, lat, lng, SEARCH_RADIUS_M
                    )
                    google_results = filtered if filtered else google_results
                return google_results[:limit], 'google'
        except Exception:
            pass

    if mapbox_access_token:
        try:
            from mapbox_service import search_places_mapbox
            from nominatim_service import merge_unique_places, search_nominatim_proximity

            results = search_places_mapbox(
                q,
                mapbox_access_token,
                lat=lat,
                lng=lng,
                limit=limit,
            )
            if results:
                provider = 'mapbox'
                if len(results) < MIN_RESULTS_BEFORE_NOMINATIM:
                    backup = search_nominatim_proximity(
                        q,
                        lat=lat,
                        lng=lng,
                        limit=limit,
                        country_code=country_code,
                    )
                    for place in backup:
                        if not place.get('image_url'):
                            placeholder = get_placeholder_by_category(place.get('category', 'other'))
                            place['image_url'] = placeholder
                            if placeholder:
                                place['photoUrl'] = placeholder
                    results = merge_unique_places(results, backup)
                    provider = 'mapbox+nominatim' if backup else provider
                if lat is not None and lng is not None:
                    results = _filter_places_by_radius(results, lat, lng, SEARCH_RADIUS_M)
                return results[:limit], provider
        except Exception:
            pass

    return search_nominatim(q, limit=limit, country_code=country_code)[:limit], 'nominatim'


def _resolve_categories(category: str = 'all', categories: list[str] | None = None) -> list[str]:
    if categories:
        return [c for c in categories if c in CATEGORY_DEFS]
    if category == 'all':
        return DEFAULT_CATEGORIES
    if category in CATEGORY_DEFS:
        return [category]
    return DEFAULT_CATEGORIES


def _build_overpass_query(lat: float, lng: float, radius: int, categories: list[str]) -> str:
    if not categories or set(categories) >= set(DEFAULT_CATEGORIES + EXPLORE_CATEGORIES):
        return f"""
[out:json][timeout:25];
(
  node["amenity"](around:{radius},{lat},{lng});
  node["shop"](around:{radius},{lat},{lng});
  node["leisure"](around:{radius},{lat},{lng});
  node["craft"](around:{radius},{lat},{lng});
  way["amenity"](around:{radius},{lat},{lng});
  way["shop"](around:{radius},{lat},{lng});
  way["leisure"](around:{radius},{lat},{lng});
  way["craft"](around:{radius},{lat},{lng});
);
out center 30;
""".strip()

    blocks: list[str] = []
    seen_filters: set[tuple[str, str]] = set()
    for cat in categories:
        for key, value in CATEGORY_DEFS.get(cat, {}).get('osm', []):
            filt = (key, value)
            if filt in seen_filters:
                continue
            seen_filters.add(filt)
            blocks.append(f'  node["{key}"="{value}"](around:{radius},{lat},{lng});')
            blocks.append(f'  way["{key}"="{value}"](around:{radius},{lat},{lng});')
    if not blocks:
        return _build_overpass_query(lat, lng, radius, DEFAULT_CATEGORIES)
    inner = '\n'.join(blocks)
    return f'[out:json][timeout:25];\n(\n{inner}\n);\nout center 30;'


def _osm_element_coords(element: dict[str, Any]) -> tuple[float | None, float | None]:
    if element.get('type') == 'node':
        return element.get('lat'), element.get('lon')
    center = element.get('center') or {}
    return center.get('lat'), center.get('lon')


def _osm_place_name(tags: dict[str, str]) -> str:
    for key in ('name', 'brand', 'operator'):
        if tags.get(key):
            return tags[key]
    for key in ('amenity', 'shop', 'leisure', 'tourism', 'craft'):
        if tags.get(key):
            return tags[key].replace('_', ' ').title()
    return 'Unnamed place'


def _osm_address(tags: dict[str, str]) -> str:
    parts = []
    for key in ('addr:housenumber', 'addr:street', 'addr:city', 'addr:state', 'addr:postcode'):
        if tags.get(key):
            parts.append(tags[key])
    if parts:
        return ', '.join(parts)
    return tags.get('addr:full', '')


def nearby_places_osm(
    lat: float,
    lng: float,
    categories: list[str],
    radius: int = 2000,
) -> list[dict[str, Any]]:
    query = _build_overpass_query(lat, lng, radius, categories)
    response = requests.post(
        OVERPASS_URL,
        data={'data': query},
        headers={'User-Agent': 'Family-Housing-Hub/1.0 (overpass)'},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    seen: set[str] = set()
    places: list[dict[str, Any]] = []
    for element in data.get('elements', []):
        el_lat, el_lng = _osm_element_coords(element)
        if el_lat is None or el_lng is None:
            continue
        tags = element.get('tags') or {}
        osm_id = f"{element.get('type')}/{element.get('id')}"
        if osm_id in seen:
            continue
        seen.add(osm_id)
        name = _osm_place_name(tags)
        if name == 'Unnamed place':
            continue
        phone, hours = _osm_phone_hours(tags)
        cat = _infer_category_from_osm(tags)
        types = [f"{k}={v}" for k, v in tags.items() if k in ('amenity', 'shop', 'leisure', 'tourism', 'healthcare', 'craft')]
        osm_photo = _osm_image_url(tags)
        places.append(
            _normalize_place(
                place_id=osm_id,
                name=name,
                lat=float(el_lat),
                lng=float(el_lng),
                address=_osm_address(tags),
                types=types,
                category=cat,
                phone=phone,
                hours=hours,
                origin_lat=lat,
                origin_lng=lng,
                source='osm',
                photo_url=osm_photo,
            )
        )
    places = _filter_places_by_radius(places, lat, lng, radius)
    return places[:40]


def nearby_places_google(
    lat: float,
    lng: float,
    api_key: str,
    categories: list[str],
    radius: int = 2000,
) -> list[dict[str, Any]]:
    seen_ids: set[str] = set()
    merged: list[dict[str, Any]] = []

    for category in categories:
        params: dict[str, Any] = {
            'location': f'{lat},{lng}',
            'radius': radius,
            'key': api_key,
        }
        place_type = GOOGLE_TYPE_MAP.get(category, '')
        if place_type:
            params['type'] = place_type
        response = requests.get(
            'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
            params=params,
            timeout=12,
        )
        data = response.json()
        if data.get('status') not in ('OK', 'ZERO_RESULTS'):
            continue
        for place in data.get('results', [])[:12]:
            pid = place.get('place_id', '')
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            loc = place.get('geometry', {}).get('location', {})
            types = place.get('types', [])
            photo_ref = _google_photo_reference(place)
            merged.append(
                _normalize_place(
                    place_id=pid,
                    name=place.get('name', ''),
                    lat=loc.get('lat', 0),
                    lng=loc.get('lng', 0),
                    address=place.get('vicinity') or place.get('formatted_address', ''),
                    rating=place.get('rating', 0) or 0,
                    types=types,
                    category=category,
                    origin_lat=lat,
                    origin_lng=lng,
                    source='google',
                    photo_reference=photo_ref,
                    photo_url=build_google_photo_url(photo_ref, api_key) if photo_ref else '',
                )
            )

    merged = _filter_places_by_radius(merged, lat, lng, radius)
    return merged[:40]


def get_nearby_places(
    lat: float,
    lng: float,
    *,
    category: str = 'all',
    categories: list[str] | None = None,
    radius: int = 2000,
    mapbox_access_token: str | None = None,
    google_api_key: str | None = None,
    country_code: str = 'us',
) -> tuple[list[dict[str, Any]], str]:
    resolved = _resolve_categories(category, categories)

    # Google first — real business photos, ratings, and POI names from Google Maps
    if google_api_key:
        try:
            places = nearby_places_google(lat, lng, google_api_key, resolved, radius)
            if places:
                return _filter_places_by_radius(places, lat, lng, radius)[:40], 'google'
        except Exception:
            pass

    if mapbox_access_token:
        try:
            from mapbox_service import nearby_places_mapbox
            from nominatim_service import merge_unique_places, nearby_nominatim

            results = nearby_places_mapbox(
                lat,
                lng,
                resolved,
                mapbox_access_token,
                radius=radius,
            )
            if results:
                provider = 'mapbox'
                if len(results) < MIN_RESULTS_BEFORE_NOMINATIM:
                    backup: list[dict[str, Any]] = []
                    for cat in resolved:
                        try:
                            backup.extend(
                                nearby_nominatim(
                                    cat,
                                    lat,
                                    lng,
                                    limit=20,
                                    country_code=country_code,
                                )
                            )
                        except Exception:
                            continue
                    for place in backup:
                        if not place.get('image_url'):
                            placeholder = get_placeholder_by_category(place.get('category', 'other'))
                            place['image_url'] = placeholder
                            if placeholder:
                                place['photoUrl'] = placeholder
                    results = merge_unique_places(results, backup)
                    results = _filter_places_by_radius(results, lat, lng, radius)
                    provider = 'mapbox+nominatim' if backup else provider
                return results[:40], provider
        except Exception:
            pass

    places = nearby_places_osm(lat, lng, resolved, radius)
    return _filter_places_by_radius(places, lat, lng, radius), 'openstreetmap'
