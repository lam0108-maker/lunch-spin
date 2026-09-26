import type { Place, RadiusMeters, UserCoords } from '../../types/place';

/**
 * OpenStreetMap Overpass — 附近飲食店（唔使 Google Places）
 * 請善用快取，避免打爆公共 Overpass。
 */

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const AMENITIES = [
  'restaurant',
  'cafe',
  'fast_food',
  'food_court',
  'biergarten',
];

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function buildQuery(lat: number, lng: number, radius: number): string {
  const around = `around:${Math.round(radius)},${lat},${lng}`;
  const parts: string[] = [];
  for (const a of AMENITIES) {
    parts.push(`node["amenity"="${a}"](${around});`);
    parts.push(`way["amenity"="${a}"](${around});`);
  }
  return `
[out:json][timeout:30];
(
  ${parts.join('\n  ')}
);
out center tags;
`.trim();
}

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OsmResponse {
  elements?: OsmElement[];
}

function pickName(tags: Record<string, string> | undefined): string {
  if (!tags) return '未命名餐廳';
  return (
    tags['name:zh-Hant'] ||
    tags['name:zh'] ||
    tags['name:en'] ||
    tags.name ||
    tags.brand ||
    '未命名餐廳'
  );
}

function pickAddress(tags: Record<string, string> | undefined): string | undefined {
  if (!tags) return undefined;
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:district'],
    tags['addr:city'],
  ].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return tags['addr:full'] || undefined;
}

export async function searchNearbyOsm(
  coords: UserCoords,
  radius: RadiusMeters,
): Promise<Place[]> {
  const query = buildQuery(coords.latitude, coords.longitude, radius);
  let lastErr: Error | null = null;
  let data: OsmResponse | null = null;

  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json',
          // Overpass 禮貌：標識係邊個 app
          'User-Agent': 'LunchSpin/1.0 (Hong Kong lunch picker; expo)',
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) {
        lastErr = new Error(`Overpass ${res.status}`);
        continue;
      }
      data = (await res.json()) as OsmResponse;
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (!data) {
    throw lastErr ?? new Error('OpenStreetMap 搜尋失敗');
  }

  const origin = { lat: coords.latitude, lng: coords.longitude };
  const byId = new Map<string, Place>();

  for (const el of data.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const dist = Math.round(haversineMeters(origin, { lat, lng }));
    if (dist > radius + 5) continue;
    const placeId = `osm_${el.type}_${el.id}`;
    const name = pickName(el.tags);
    byId.set(placeId, {
      placeId,
      name,
      distanceMeters: dist,
      priceLevel: null,
      rating: null,
      ratingCount: null,
      isOpenNow: null,
      address: pickAddress(el.tags),
      lat,
      lng,
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 80);
}
