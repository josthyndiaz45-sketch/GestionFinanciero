export const CURRENCY_SYMBOL = 'S/';
export const CURRENCY_CODE = 'PEN';

export const INCOME_COLOR = '#10B981';
export const EXPENSE_COLOR = '#F43F5E';
export const PRIMARY_COLOR = '#4F46E5';

export const ACCENT_PRESETS = [
  { key: 'indigo', label: 'Índigo', color: '#4F46E5', gradient: ['#6366F1', '#8B5CF6'], dark: '#4338CA' },
  { key: 'blue', label: 'Azul', color: '#2563EB', gradient: ['#3B82F6', '#0EA5E9'], dark: '#1D4ED8' },
  { key: 'violet', label: 'Violeta', color: '#7C3AED', gradient: ['#8B5CF6', '#A855F7'], dark: '#6D28D9' },
  { key: 'emerald', label: 'Esmeralda', color: '#059669', gradient: ['#10B981', '#059669'], dark: '#047857' },
  { key: 'rose', label: 'Rosa', color: '#E11D48', gradient: ['#F43F5E', '#EC4899'], dark: '#BE123C' },
  { key: 'orange', label: 'Naranja', color: '#EA580C', gradient: ['#F97316', '#FB923C'], dark: '#C2410C' },
  { key: 'cyan', label: 'Cian', color: '#0891B2', gradient: ['#06B6D4', '#0EA5E9'], dark: '#0E7490' },
  { key: 'slate', label: 'Pizarra', color: '#334155', gradient: ['#475569', '#0F172A'], dark: '#1E293B' },
];

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function mixHex(hex, target, weight) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const r = Math.round(a.r + (b.r - a.r) * weight);
  const g = Math.round(a.g + (b.g - a.g) * weight);
  const bl = Math.round(a.b + (b.b - a.b) * weight);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function applyAccent(baseTheme, preset) {
  if (!preset) return baseTheme;
  const dark = baseTheme.dark;
  const soft = mixHex(preset.color, dark ? '#0A0F1E' : '#FFFFFF', dark ? 0.82 : 0.9);
  const muted = mixHex(preset.color, dark ? '#0A0F1E' : '#FFFFFF', dark ? 0.68 : 0.8);
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: preset.color,
      primaryDark: preset.dark,
      primarySoft: soft,
      primaryMuted: muted,
      gradientStart: preset.gradient[0],
      gradientEnd: preset.gradient[1],
    },
    shadow: {
      ...baseTheme.shadow,
      hero: { ...baseTheme.shadow.hero, shadowColor: preset.color },
    },
  };
}

export const INCOME_CATEGORIES = [
  { name: 'trabajo', label: 'Trabajo', icon: 'briefcase-outline', color: '#10B981' },
  { name: 'evento', label: 'Evento', icon: 'gift-outline', color: '#8B5CF6' },
  { name: 'pago', label: 'Pago', icon: 'card-outline', color: '#3B82F6' },
  { name: 'venta', label: 'Venta', icon: 'storefront-outline', color: '#F59E0B' },
  { name: 'otros', label: 'Otros', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export const EXPENSE_CATEGORIES = [
  { name: 'transporte', label: 'Transporte', icon: 'car-outline', color: '#3B82F6' },
  { name: 'alimentacion', label: 'Alimentación', icon: 'restaurant-outline', color: '#F97316' },
  { name: 'equipos', label: 'Equipos', icon: 'desktop-outline', color: '#8B5CF6' },
  { name: 'compras', label: 'Compras', icon: 'bag-handle-outline', color: '#EC4899' },
  { name: 'servicios', label: 'Servicios', icon: 'receipt-outline', color: '#2563EB' },
  { name: 'entretenimiento', label: 'Entretenimiento', icon: 'game-controller-outline', color: '#0891B2' },
  { name: 'otros', label: 'Otros', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export const CATEGORY_ICONS = [
  'pricetag-outline',
  'briefcase-outline',
  'gift-outline',
  'card-outline',
  'storefront-outline',
  'ellipsis-horizontal-outline',
  'car-outline',
  'restaurant-outline',
  'desktop-outline',
  'bag-handle-outline',
  'receipt-outline',
  'game-controller-outline',
  'home-outline',
  'school-outline',
  'fitness-outline',
  'medkit-outline',
  'airplane-outline',
  'bus-outline',
  'cafe-outline',
  'cart-outline',
  'shirt-outline',
  'construct-outline',
  'paw-outline',
  'phone-portrait-outline',
  'flash-outline',
  'water-outline',
  'umbrella-outline',
  'musical-notes-outline',
  'football-outline',
  'heart-outline',
  'cash-outline',
  'trending-up-outline',
  'people-outline',
  'barbell-outline',
  'color-palette-outline',
  'library-outline',
];

export const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Yape',
  'Plin',
  'Débito automático',
];

const INCOME_SOFT_LIGHT = '#ECFDF5';
const INCOME_SOFT_DARK = '#0F2E24';
const INCOME_TEXT_LIGHT = '#065F46';
const INCOME_TEXT_DARK = '#6EE7B7';
const EXPENSE_SOFT_LIGHT = '#FFF1F2';
const EXPENSE_SOFT_DARK = '#3B1620';
const EXPENSE_TEXT_LIGHT = '#9F1239';
const EXPENSE_TEXT_DARK = '#FDA4AF';

export const LIGHT_THEME = {
  dark: false,
  colors: {
    background: '#F4F6FC',
    card: '#FFFFFF',
    text: '#131A2E',
    textSecondary: '#6B7488',
    border: '#EAEDF6',
    primary: PRIMARY_COLOR,
    primaryDark: '#4338CA',
    primarySoft: '#EEF0FF',
    primaryMuted: '#DFE2FF',
    onPrimary: '#FFFFFF',
    surface: '#F1F3FA',
    surfaceAlt: '#EAEEF8',
    income: INCOME_COLOR,
    incomeSoft: INCOME_SOFT_LIGHT,
    incomeText: INCOME_TEXT_LIGHT,
    expense: EXPENSE_COLOR,
    expenseSoft: EXPENSE_SOFT_LIGHT,
    expenseText: EXPENSE_TEXT_LIGHT,
    warning: '#F59E0B',
    warningSoft: '#FFF7E6',
    danger: '#F43F5E',
    dangerSoft: '#FFF1F2',
    accent: '#8B5CF6',
    accentSoft: '#F3F0FF',
    info: '#0EA5E9',
    infoSoft: '#ECFAFF',
    gradientStart: '#6366F1',
    gradientEnd: '#8B5CF6',
    gradientIncome: '#10B981',
    gradientIncomeEnd: '#0EA5E9',
  },
  radii: { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 },
  spacing: { xs: 6, sm: 10, md: 16, lg: 20, xl: 28 },
  shadow: {
    soft: { shadowColor: '#131A2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    card: { shadowColor: '#131A2E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
    hero: { shadowColor: PRIMARY_COLOR, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.34, shadowRadius: 26, elevation: 12 },
  },
};

export const DARK_THEME = {
  dark: true,
  colors: {
    background: '#080B16',
    card: '#141A2C',
    text: '#F1F5F9',
    textSecondary: '#94A0B8',
    border: '#212B42',
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    primarySoft: '#181F3E',
    primaryMuted: '#262F5C',
    onPrimary: '#FFFFFF',
    surface: '#1A2238',
    surfaceAlt: '#1F2A43',
    income: INCOME_COLOR,
    incomeSoft: INCOME_SOFT_DARK,
    incomeText: INCOME_TEXT_DARK,
    expense: EXPENSE_COLOR,
    expenseSoft: EXPENSE_SOFT_DARK,
    expenseText: EXPENSE_TEXT_DARK,
    warning: '#FBBF24',
    warningSoft: '#2C2410',
    danger: '#FB7185',
    dangerSoft: '#3B1620',
    accent: '#A78BFA',
    accentSoft: '#231B45',
    info: '#38BDF8',
    infoSoft: '#0B2735',
    gradientStart: '#6366F1',
    gradientEnd: '#A855F7',
    gradientIncome: '#10B981',
    gradientIncomeEnd: '#38BDF8',
  },
  radii: { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 },
  spacing: { xs: 6, sm: 10, md: 16, lg: 20, xl: 28 },
  shadow: {
    soft: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 2 },
    card: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 4 },
    hero: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.45, shadowRadius: 26, elevation: 12 },
  },
};

export function getCategoryInfo(categoryName, type) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories.find((c) => c.name === categoryName) || categories[categories.length - 1];
}
