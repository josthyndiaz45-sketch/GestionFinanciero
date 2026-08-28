export const CURRENCY_SYMBOL = 'S/';
export const CURRENCY_CODE = 'PEN';

export const INCOME_COLOR = '#10B981';
export const EXPENSE_COLOR = '#F43F5E';
export const PRIMARY_COLOR = '#5d82b2';

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
  { name: 'servicios', label: 'Servicios', icon: 'receipt-outline', color: '#6366F1' },
  { name: 'entretenimiento', label: 'Entretenimiento', icon: 'game-controller-outline', color: '#14B8A6' },
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
    background: '#FAFAFA',
    card: '#FFFFFF',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    primary: PRIMARY_COLOR,
    income: INCOME_COLOR,
    expense: EXPENSE_COLOR,
    surface: '#F3F4F6',
  },
};

export const DARK_THEME = {
  dark: true,
  colors: {
    background: '#1A1A2E',
    card: '#252540',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    primary: PRIMARY_COLOR,
    income: INCOME_COLOR,
    expense: EXPENSE_COLOR,
    surface: '#2D2D50',
  },
};

export function getCategoryInfo(categoryName, type) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories.find((c) => c.name === categoryName) || categories[categories.length - 1];
}
