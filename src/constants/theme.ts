import { ViewStyle, TextStyle } from 'react-native';

/** Warm Lunch palette — keep light theme; primary stays ~#FF6B35 */
export const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryMuted: '#FFE4D9',
  secondary: '#004E89',
  secondaryMuted: '#E8F1F8',
  background: '#FFF8F3',
  surface: '#FFFDFB',
  card: '#FFFFFF',
  overlay: 'rgba(26, 26, 26, 0.45)',
  text: '#1A1A1A',
  textMuted: '#6B6B6B',
  textSubtle: '#8A8A8A',
  textOnPrimary: '#FFFFFF',
  border: '#F0E6DE',
  borderStrong: '#E0D5CB',
  chipBg: '#FFF1EA',
  chipSelected: '#FF6B35',
  chipSelectedText: '#FFFFFF',
  success: '#2A9D8F',
  successMuted: '#E7F5F2',
  danger: '#E63946',
  dangerMuted: '#FDECEC',
  warn: '#856404',
  warnBg: '#FFF8E7',
  accentWarm: '#F4A261',
  accentSoft: '#FFE8D6',
  stickyBar: '#FFF8F3',
  wheel: [
    '#FF6B35',
    '#FF8C5A',
    '#004E89',
    '#2A9D8F',
    '#E9C46A',
    '#E76F51',
    '#264653',
    '#F4A261',
  ],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  /** Card inner padding */
  card: 16,
  /** Gap between major sections / cards */
  section: 14,
  /** Compact gap inside dense chip wraps */
  chipGap: 6,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  hero: {
    fontSize: 28,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 34,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 19,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 17,
  },
  label: {
    fontSize: 14,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  helper: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 17,
  },
  button: {
    fontSize: 17,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  buttonSm: {
    fontSize: 14,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 18,
  },
};

export const shadows = {
  soft: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  } satisfies ViewStyle,
  card: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  } satisfies ViewStyle,
  elevated: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  } satisfies ViewStyle,
  sticky: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  } satisfies ViewStyle,
};
