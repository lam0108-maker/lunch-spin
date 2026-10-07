import AsyncStorage from '@react-native-async-storage/async-storage';

const MORE_SURPRISE_KEY = 'lunchspin:moreSurprise';

/** 「多啲驚喜」：預設關閉 */
export async function getMoreSurprise(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(MORE_SURPRISE_KEY);
  return raw === '1' || raw === 'true';
}

export async function setMoreSurprise(on: boolean): Promise<void> {
  await AsyncStorage.setItem(MORE_SURPRISE_KEY, on ? '1' : '0');
}
