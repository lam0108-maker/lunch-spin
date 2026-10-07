import type { UserCoords } from '../types/place';

/** MVP：香港常見地區硬編碼座標（約中心點） */
export const HK_DISTRICTS: Record<string, UserCoords> = {
  中環: { latitude: 22.2819, longitude: 114.1581, label: '中環', isFallback: true },
  金鐘: { latitude: 22.2783, longitude: 114.1647, label: '金鐘', isFallback: true },
  '中環／金鐘': { latitude: 22.2815, longitude: 114.162, label: '中環／金鐘', isFallback: true },
  灣仔: { latitude: 22.2783, longitude: 114.1722, label: '灣仔', isFallback: true },
  銅鑼灣: { latitude: 22.2800, longitude: 114.1850, label: '銅鑼灣', isFallback: true },
  尖沙咀: { latitude: 22.2976, longitude: 114.1722, label: '尖沙咀', isFallback: true },
  佐敦: { latitude: 22.3050, longitude: 114.1700, label: '佐敦', isFallback: true },
  旺角: { latitude: 22.3193, longitude: 114.1694, label: '旺角', isFallback: true },
  太子: { latitude: 22.3246, longitude: 114.1683, label: '太子', isFallback: true },
  觀塘: { latitude: 22.3120, longitude: 114.2250, label: '觀塘', isFallback: true },
  牛頭角: { latitude: 22.3240, longitude: 114.2160, label: '牛頭角', isFallback: true },
  九龍灣: { latitude: 22.3230, longitude: 114.2100, label: '九龍灣', isFallback: true },
  藍田: { latitude: 22.3080, longitude: 114.2350, label: '藍田', isFallback: true },
  油塘: { latitude: 22.2970, longitude: 114.2390, label: '油塘', isFallback: true },
  秀茂坪: { latitude: 22.3200, longitude: 114.2350, label: '秀茂坪', isFallback: true },
  鯉魚門: { latitude: 22.2910, longitude: 114.2380, label: '鯉魚門', isFallback: true },
  荃灣: { latitude: 22.3707, longitude: 114.1145, label: '荃灣', isFallback: true },
  葵芳: { latitude: 22.3575, longitude: 114.1275, label: '葵芳', isFallback: true },
  沙田: { latitude: 22.3828, longitude: 114.1880, label: '沙田', isFallback: true },
  大埔: { latitude: 22.4508, longitude: 114.1645, label: '大埔', isFallback: true },
  屯門: { latitude: 22.3916, longitude: 113.9770, label: '屯門', isFallback: true },
  元朗: { latitude: 22.4445, longitude: 114.0222, label: '元朗', isFallback: true },
  將軍澳: { latitude: 22.3119, longitude: 114.2570, label: '將軍澳', isFallback: true },
  北角: { latitude: 22.2910, longitude: 114.2005, label: '北角', isFallback: true },
  鰂魚涌: { latitude: 22.2875, longitude: 114.2125, label: '鰂魚涌', isFallback: true },
  '鰂魚涌／太古': { latitude: 22.2875, longitude: 114.2125, label: '鰂魚涌／太古', isFallback: true },
  西環: { latitude: 22.2860, longitude: 114.1350, label: '西環', isFallback: true },
  紅磡: { latitude: 22.3040, longitude: 114.1820, label: '紅磡', isFallback: true },
  // phase-3 local seed district
  油麻地: { latitude: 22.3120, longitude: 114.1700, label: '油麻地', isFallback: true },
};

export const DISTRICT_NAMES = Object.keys(HK_DISTRICTS);

export function resolveDistrict(input: string): UserCoords | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (HK_DISTRICTS[trimmed]) return { ...HK_DISTRICTS[trimmed] };
  const hit = DISTRICT_NAMES.find(
    (d) => trimmed.includes(d) || d.includes(trimmed),
  );
  return hit ? { ...HK_DISTRICTS[hit] } : null;
}
