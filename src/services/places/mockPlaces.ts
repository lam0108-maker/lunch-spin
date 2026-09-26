import type { Place, RadiusMeters, UserCoords } from '../../types/place';

const MOCK_NAMES = [
  '一蘭拉麵',
  '譚仔三哥',
  '麥當勞',
  '吉野家',
  '大家樂',
  '美心MX',
  '爭鮮迴轉壽司',
  '長崎亭',
  '肉骨茶',
  '越南粉專門店',
  '意粉屋',
  '燒味快餐',
  '豆腐火腩飯',
  '韓式炸雞',
  '海南雞飯',
  '車仔麵',
  '粥麵專家',
  '日式定食',
  '泰式炒河',
  '咖喱屋',
  '叮叮餐廳',
  '茶餐廳',
  '壽司郎',
  '丼丼屋',
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 根據座標 + 半徑產生穩定 mock 餐廳，方便無 API key 演示 */
export function getMockNearbyPlaces(
  coords: UserCoords,
  radius: RadiusMeters,
): Place[] {
  const seed = hash(
    `${coords.latitude.toFixed(3)}:${coords.longitude.toFixed(3)}:${radius}`,
  );
  const count = 40 + (seed % 5); // 40-44
  const places: Place[] = [];
  const maxDist = Math.max(radius, 100);
  for (let i = 0; i < count; i++) {
    const name = MOCK_NAMES[(seed + i * 7) % MOCK_NAMES.length]!;
    const dist = 50 + ((seed + i * 13) % Math.max(50, maxDist - 50));
    places.push({
      placeId: `mock_${seed}_${i}`,
      name: `${name}${coords.label ? `（${coords.label}）` : ''}`,
      distanceMeters: dist,
      priceLevel: (seed + i) % 4,
      rating: 3.5 + ((seed + i) % 15) / 10,
      ratingCount: 50 + ((seed + i * 3) % 400),
      isOpenNow: true,
      address: coords.label ?? '香港',
      lat: coords.latitude + (i - count / 2) * 0.0006,
      lng: coords.longitude + (i - count / 2) * 0.0006,
    });
  }
  return places;
}
