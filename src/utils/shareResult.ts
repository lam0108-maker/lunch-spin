import { Alert, Platform, Share } from 'react-native';
import type { Place } from '../types/place';
import { formatPlacePrice, formatWalkMinutes } from './format';

export function buildShareText(place: Place, includeAddress = true): string {
  const cuisine =
    (place.cuisine ?? []).find((c) => !!c?.trim())?.trim() || '未分類';
  const price = formatPlacePrice(place) || '價錢未知';
  const walk = formatWalkMinutes(place.distanceMeters) || '行路時間未知';
  // formatWalkMinutes：「少過 1 分鐘」／「約 X 分鐘行路」
  let text = `今日抽Lunch：${place.name}｜${cuisine}｜${price}｜${walk}`;
  if (includeAddress && place.address?.trim()) {
    text += `\n${place.address.trim()}`;
  }
  return text;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    if (typeof document !== 'undefined') {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Web：navigator.share → clipboard + Alert
 * Native：React Native Share
 */
export async function shareLunchResult(place: Place): Promise<void> {
  const message = buildShareText(place, true);

  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && typeof (nav as Navigator & { share?: unknown }).share === 'function') {
      try {
        await (
          nav as Navigator & { share: (d: ShareData) => Promise<void> }
        ).share({
          title: '今日抽Lunch',
          text: message,
        });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    }
    const copied = await copyToClipboard(message);
    if (copied) {
      Alert.alert('已複製', '結果已複製到剪貼簿，可以貼去 WhatsApp／Telegram。');
    } else {
      Alert.alert('分享失敗', '請手動複製：\n\n' + message);
    }
    return;
  }

  try {
    await Share.share({ message, title: '今日抽Lunch' });
  } catch {
    const copied = await copyToClipboard(message);
    if (copied) {
      Alert.alert('已複製', '結果已複製到剪貼簿。');
    } else {
      Alert.alert('分享失敗', '請稍後再試。');
    }
  }
}
