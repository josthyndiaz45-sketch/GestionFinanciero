export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `S/ ${num.toFixed(2)}`;
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateLong(date) {
  if (!date) return '';
  const d = new Date(date);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} ${year}`;
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function getDateRange(period) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'thisMonth':
      start.setDate(1);
      break;
    case 'lastMonth':
      start.setMonth(start.getMonth() - 1, 1);
      now.setMonth(now.getMonth(), 0);
      now.setHours(23, 59, 59, 999);
      break;
    case 'last3Months':
      start.setMonth(start.getMonth() - 2, 1);
      break;
    case 'thisYear':
      start.setMonth(0, 1);
      break;
    default:
      break;
  }
  return {
    start: start.toISOString(),
    end: period === 'lastMonth' ? now.toISOString() : new Date().toISOString(),
  };
}
