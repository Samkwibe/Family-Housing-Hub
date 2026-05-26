"""Google Maps Platform Weather API — uses GOOGLE_MAPS_API_KEY."""

from __future__ import annotations

from typing import Any

import requests

WEATHER_BASE = 'https://weather.googleapis.com/v1'


def _localized_text(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get('text') or value.get('localizedText') or '').strip()
    if isinstance(value, str):
        return value.strip()
    return ''


def _temp_value(temp: Any) -> float | None:
    if not isinstance(temp, dict):
        return None
    degrees = temp.get('degrees')
    if degrees is None:
        return None
    try:
        return round(float(degrees), 1)
    except (TypeError, ValueError):
        return None


def _temp_unit(temp: Any) -> str:
    if isinstance(temp, dict):
        unit = str(temp.get('unit') or '').upper()
        if unit in ('FAHRENHEIT', 'F'):
            return 'F'
        if unit in ('CELSIUS', 'C'):
            return 'C'
    return 'F'


def _weather_icon_url(condition: dict[str, Any] | None, dark: bool = False) -> str:
    if not condition:
        return ''
    base = (condition.get('iconBaseUri') or '').strip()
    if not base:
        return ''
    suffix = '_dark' if dark else ''
    if base.endswith('.svg') or base.endswith('.png'):
        return base.replace('.svg', f'{suffix}.svg').replace('.png', f'{suffix}.png')
    return f'{base}{suffix}.svg'


def _speed_unit(speed: Any) -> str:
    if isinstance(speed, dict):
        unit = str(speed.get('unit') or '').upper()
        if 'MILE' in unit or unit == 'MPH':
            return 'mph'
        if 'KILOMETER' in unit or unit == 'KMH':
            return 'km/h'
    return 'mph'


def _normalize_current(data: dict[str, Any]) -> dict[str, Any]:
    condition = data.get('weatherCondition') or {}
    temp = data.get('temperature') or {}
    feels = data.get('feelsLikeTemperature') or {}
    wind = data.get('wind') or {}
    precip = data.get('precipitation') or {}

    speed = wind.get('speed') or {}
    gust = wind.get('gust') or {}

    return {
        'description': _localized_text(condition.get('description')),
        'conditionType': condition.get('type') or '',
        'iconUrl': _weather_icon_url(condition),
        'iconUrlDark': _weather_icon_url(condition, dark=True),
        'temperature': _temp_value(temp),
        'temperatureUnit': _temp_unit(temp),
        'feelsLike': _temp_value(feels),
        'humidity': data.get('relativeHumidity'),
        'uvIndex': data.get('uvIndex'),
        'cloudCover': data.get('cloudCover'),
        'isDaytime': data.get('isDaytime'),
        'windSpeed': _temp_value(speed),
        'windSpeedUnit': _speed_unit(speed),
        'windGust': _temp_value(gust),
        'windDirection': _localized_text((wind.get('direction') or {}).get('cardinal')),
        'precipitationProbability': precip.get('probability') or data.get('precipitationProbability'),
        'precipitationType': precip.get('type') or '',
        'thunderstormProbability': data.get('thunderstormProbability'),
        'visibility': _temp_value(data.get('visibility') or {}),
        'currentTime': data.get('currentTime') or data.get('currentConditionsTime'),
    }


def _normalize_daily_day(day: dict[str, Any]) -> dict[str, Any]:
    daytime = day.get('daytimeForecast') or {}
    daytime_condition = daytime.get('weatherCondition') or {}
    display = day.get('displayDate') or {}

    return {
        'date': {
            'year': display.get('year'),
            'month': display.get('month'),
            'day': display.get('day'),
        },
        'maxTemperature': _temp_value(day.get('maxTemperature')),
        'minTemperature': _temp_value(day.get('minTemperature')),
        'description': _localized_text(daytime_condition.get('description')),
        'iconUrl': _weather_icon_url(daytime_condition),
        'precipitationProbability': (daytime.get('precipitation') or {}).get('probability'),
        'humidity': daytime.get('relativeHumidity'),
        'uvIndex': daytime.get('uvIndex'),
    }


def _normalize_hour(hour: dict[str, Any]) -> dict[str, Any]:
    condition = hour.get('weatherCondition') or {}
    return {
        'time': hour.get('interval', {}).get('startTime') or hour.get('displayDateTime'),
        'temperature': _temp_value(hour.get('temperature')),
        'description': _localized_text(condition.get('description')),
        'iconUrl': _weather_icon_url(condition),
        'precipitationProbability': (hour.get('precipitation') or {}).get('probability'),
    }


def _normalize_alert(alert: dict[str, Any]) -> dict[str, Any]:
    return {
        'title': _localized_text(alert.get('title')),
        'description': _localized_text(alert.get('description')),
        'severity': alert.get('severity') or '',
        'eventType': alert.get('eventType') or '',
        'startTime': alert.get('startTime'),
        'endTime': alert.get('endTime'),
    }


def _weather_get(
    path: str,
    api_key: str,
    lat: float,
    lng: float,
    *,
    units_system: str = 'IMPERIAL',
    extra_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        'key': api_key,
        'location.latitude': lat,
        'location.longitude': lng,
        'unitsSystem': units_system,
    }
    if extra_params:
        params.update(extra_params)
    response = requests.get(f'{WEATHER_BASE}/{path}', params=params, timeout=12)
    response.raise_for_status()
    return response.json()


def get_weather_summary(
    lat: float,
    lng: float,
    *,
    api_key: str,
    units_system: str = 'IMPERIAL',
    days: int = 5,
    hours: int = 12,
    include_alerts: bool = True,
) -> dict[str, Any]:
    if not api_key:
        raise ValueError('Google Maps API key is required for weather')

    current_raw = _weather_get(
        'currentConditions:lookup',
        api_key,
        lat,
        lng,
        units_system=units_system,
    )
    daily_raw = _weather_get(
        'forecast/days:lookup',
        api_key,
        lat,
        lng,
        units_system=units_system,
        extra_params={'days': min(max(days, 1), 10)},
    )
    hourly_raw = _weather_get(
        'forecast/hours:lookup',
        api_key,
        lat,
        lng,
        units_system=units_system,
        extra_params={'hours': min(max(hours, 1), 24)},
    )

    alerts: list[dict[str, Any]] = []
    if include_alerts:
        try:
            alerts_raw = _weather_get(
                'publicAlerts:lookup',
                api_key,
                lat,
                lng,
                units_system=units_system,
            )
            alerts = [
                _normalize_alert(a)
                for a in (alerts_raw.get('publicAlerts') or alerts_raw.get('alerts') or [])
            ]
        except Exception:
            alerts = []

    current = _normalize_current(current_raw)
    daily = [_normalize_daily_day(d) for d in (daily_raw.get('forecastDays') or [])]
    hourly = [_normalize_hour(h) for h in (hourly_raw.get('forecastHours') or [])]

    tz = daily_raw.get('timeZone') or current_raw.get('timeZone') or {}
    timezone_id = tz.get('id') if isinstance(tz, dict) else str(tz or '')

    pollen = None
    timezone_detail = None
    try:
        from google_platform_service import pollen_forecast, timezone_google

        pollen = pollen_forecast(lat, lng, api_key, days=min(days, 3))
        timezone_detail = timezone_google(lat, lng, api_key)
    except Exception:
        pass

    return {
        'provider': 'google',
        'location': {'lat': lat, 'lng': lng},
        'unitsSystem': units_system,
        'timeZone': timezone_id,
        'timezone': timezone_detail,
        'current': current,
        'daily': daily,
        'hourly': hourly,
        'alerts': alerts,
        'pollen': pollen,
    }
