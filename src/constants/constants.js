export const CURRENCY_SYMBOL = 'S/';
export const CURRENCY_CODE = 'PEN';

export const INCOME_COLOR = '#10B981';
export const EXPENSE_COLOR = '#EF4444';
export const PRIMARY_COLOR = '#2563EB';

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

export const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Yape',
  'Plin',
  'Débito automático',
];

export const TRANSACTION_TAGS = ['Personal', 'Evento', 'Trabajo', 'Estudios'];

export const TAG_COLORS = {
  'Personal': '#6366F1',
  'Evento': '#F59E0B',
  'Trabajo': '#10B981',
  'Estudios': '#3B82F6',
};

export const LIGHT_THEME = {
  dark: false,
  colors: {
    background: '#F4F6FB',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    primary: PRIMARY_COLOR,
    income: INCOME_COLOR,
    expense: EXPENSE_COLOR,
    surface: '#F1F5F9',
    primarySoft: '#EFF6FF',
    primaryMuted: '#DBEAFE',
  },
  radii: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

export const DARK_THEME = {
  dark: true,
  colors: {
    background: '#0B1220',
    card: '#151E31',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#263039',
    primary: '#3B82F6',
    income: INCOME_COLOR,
    expense: EXPENSE_COLOR,
    surface: '#1E293B',
    primarySoft: '#172554',
    primaryMuted: '#1E3A8A',
  },
  radii: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

export function getCategoryInfo(categoryName, type) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories.find((c) => c.name === categoryName) || categories[categories.length - 1];
}
