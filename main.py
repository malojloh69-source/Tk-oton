#!/usr/bin/env python3
"""TK OTON: static site plus a cached, rate-limited routing proxy. Python 3.9+, stdlib only."""
import json
import math
import mimetypes
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE = Path(__file__).resolve().parent
PUBLIC = BASE / 'dist' if (BASE / 'dist').is_dir() else BASE
GEOCODER = 'https://photon.komoot.io/api/'
ROUTER = 'https://routing.openstreetmap.de/routed-car/route/v1/driving/'
_cache, _lock, _last = {}, threading.Lock(), 0.0


def upstream(url):
    global _last
    with _lock:
        now = time.monotonic()
        if url in _cache and now - _cache[url][0] < 86400:
            return _cache[url][1]
        time.sleep(max(0, 1.1 - (now - _last)))
        _last = time.monotonic()
        req = urllib.request.Request(url, headers={'User-Agent': 'TK-OTON/3.0 (cargo route calculator)', 'Accept': 'application/json', 'Accept-Language': 'ru'})
        with urllib.request.urlopen(req, timeout=18) as response:
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Ответ маршрутизатора слишком большой.')
        result = json.loads(raw)
        if len(_cache) >= 256:
            _cache.pop(next(iter(_cache)))
        _cache[url] = (time.monotonic(), result)
        return result


def coordinates(value):
    parts = value.split(';')
    if len(parts) != 2:
        raise ValueError('Нужны две точки маршрута.')
    points = []
    for part in parts:
        pair = part.split(',')
        if len(pair) != 2:
            raise ValueError('Некорректные координаты.')
        lon, lat = map(float, pair)
        if not (math.isfinite(lon) and math.isfinite(lat) and -180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValueError('Некорректные координаты.')
        points.append(f'{lon:.6f},{lat:.6f}')
    return ';'.join(points)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def send_json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        try:
            if parsed.path == '/api/health':
                return self.send_json({'service': 'tk-oton-logistics'})
            if parsed.path == '/api/geocode':
                q = query.get('q', [''])[0].strip()
                if not 2 <= len(q) <= 200 or any(ord(c) < 32 for c in q):
                    raise ValueError('Укажите город или адрес в России.')
                url = GEOCODER + '?' + urllib.parse.urlencode({'q': q, 'countrycode': 'RU', 'limit': 5})
                return self.send_json(upstream(url))
            if parsed.path == '/api/route':
                value = coordinates(query.get('coordinates', [''])[0])
                url = ROUTER + value + '?overview=simplified&geometries=geojson&steps=false'
                return self.send_json(upstream(url))
            if parsed.path.startswith('/api/'):
                return self.send_json({'error': 'Не найдено'}, 404)
            name = urllib.parse.unquote(parsed.path).lstrip('/') or 'index.html'
            path = (PUBLIC / name).resolve()
            allowed = {'.html', '.css', '.js', '.webp', '.svg', '.png', '.jpg', '.ico'}
            if not path.is_relative_to(PUBLIC.resolve()) or path.suffix.lower() not in allowed or not path.is_file() or any(p.startswith('.') for p in Path(name).parts):
                return self.send_json({'error': 'Не найдено'}, 404)
            raw = path.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
            self.send_header('Content-Length', str(len(raw)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(raw)
        except (ValueError, TypeError):
            self.send_json({'error': 'Проверьте адреса и координаты.'}, 400)
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
            self.send_json({'error': 'Сервис маршрутов недоступен. Повторите позже или укажите километраж вручную.'}, 502)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '3000'))
    print(f'TK OTON: http://localhost:{port} (для остановки Ctrl+C)', flush=True)
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
