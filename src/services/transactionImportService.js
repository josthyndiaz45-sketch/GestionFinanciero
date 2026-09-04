import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import { supabase } from '../config/supabase';
import { safeQuery } from './supabaseHelper';
import { generateId } from '../utils/generateId';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/constants';

export function pickTransactionsFile() {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      reject(new Error('Solo disponible en el navegador'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls,.txt';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buffer = reader.result;
          const parsed = parseTransactionsFile(buffer, file.name);
          resolve({ name: file.name, ...parsed });
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsArrayBuffer(file);
    };
    input.oncancel = () => reject(new Error('Importación cancelada'));
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function detectColumns(headers) {
  const cols = { date: -1, description: -1, type: -1, amount: -1, cargo: -1, abono: -1, category: -1 };
  headers.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (cols.date === -1 && /(fech|date)/.test(n)) cols.date = i;
    if (cols.description === -1 && /(descripcion|description|concepto|detalle|nota|glosa|comercio|observacion|referencia|ref)/.test(n)) cols.description = i;
    if (cols.type === -1 && /(tipo|type|naturaleza|operacion)/.test(n)) cols.type = i;
    if (cols.cargo === -1 && /(cargo|debe|retiro|egreso|salida|debito|debit)/.test(n)) cols.cargo = i;
    if (cols.abono === -1 && /(abono|haber|ingreso|deposito|entrada|credito|credit)/.test(n)) cols.abono = i;
    if (cols.amount === -1 && /(monto|importe|amount|valor|total|saldo)/.test(n)) cols.amount = i;
    if (cols.category === -1 && /(categor|category|rubro|grupo)/.test(n)) cols.category = i;
  });
  return cols;
}

function looksLikeHeader(headers) {
  return headers.some((h) => /(fech|monto|importe|descripcion|concepto|abono|cargo|amount|date)/.test(normalizeHeader(h)));
}

function parseDate(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    return null;
  }
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}-${String(Number(iso[3])).padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function parseAmount(value) {
  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    let s = value.trim().replace(/[^0-9.,\-]/g, '');
    if (!s) return null;
    const negative = s.startsWith('-');
    s = s.replace(/-/g, '');
    if (!s) return null;
    if (s.includes(',') && s.includes('.')) {
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      if (lastComma > lastDot) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      s = s.replace(/,/g, '.');
    }
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    return negative ? -n : n;
  }
  return null;
}

function parseCellsToNumber(value) {
  return parseAmount(value);
}

function classifyRow(cells, cols) {
  let amount = null;
  let type = null;

  let typeFromCol = null;
  if (cols.type !== -1) {
    const t = normalizeHeader(cells[cols.type]);
    if (/gasto|egreso|expense|debito|retiro/.test(t)) typeFromCol = 'expense';
    else if (/ingreso|income|abono|credito|deposito/.test(t)) typeFromCol = 'income';
  }

  if (cols.cargo !== -1 || cols.abono !== -1) {
    const cargo = cols.cargo !== -1 ? parseCellsToNumber(cells[cols.cargo]) : null;
    const abono = cols.abono !== -1 ? parseCellsToNumber(cells[cols.abono]) : null;
    if (cargo) {
      amount = Math.abs(cargo);
      type = typeFromCol || 'expense';
    } else if (abono) {
      amount = Math.abs(abono);
      type = typeFromCol || 'income';
    }
  } else if (cols.amount !== -1) {
    const raw = parseCellsToNumber(cells[cols.amount]);
    if (raw !== null && raw !== 0) {
      amount = Math.abs(raw);
      type = typeFromCol || (raw < 0 ? 'expense' : 'income');
    }
  }

  if (amount === null || amount === 0) return null;

  let description = '';
  if (cols.description !== -1) {
    description = String(cells[cols.description] ?? '').trim();
  }
  if (!description && cols.type !== -1) {
    const t = normalizeHeader(cells[cols.type]);
    if (!/ingreso|gasto|income|expense|abono|cargo|credito|debito/.test(t)) {
      description = String(cells[cols.type] ?? '').trim();
    }
  }
  if (!description) {
    description = type === 'income' ? 'Ingreso importado' : 'Gasto importado';
  }

  const category = cols.category !== -1 ? mapCategoryLabel(cells[cols.category], type) : 'otros';

  let date = null;
  if (cols.date !== -1) date = parseDate(cells[cols.date]);
  if (!date) {
    for (let i = 0; i < cells.length; i += 1) {
      if (i === cols.date || i === cols.description || i === cols.amount || i === cols.cargo || i === cols.abono) continue;
      const d = parseDate(cells[i]);
      if (d) {
        date = d;
        break;
      }
    }
  }
  if (!date) date = new Date().toISOString().slice(0, 10);

  return { date, description, amount, type, category };
}

function mapCategoryLabel(label, type) {
  const n = normalizeHeader(label);
  if (!n) return 'otros';
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const found = list.find((c) => normalizeHeader(c.label) === n);
  return found ? found.name : 'otros';
}

export function parseTransactionsFile(buffer, fileName) {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('El archivo no contiene hojas de datos');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const isXlsx = /\.(xlsx|xls)$/i.test(fileName || '');

  let startRow = 0;
  const headers = rows.length ? rows[0].map((c) => String(c ?? '')) : [];
  const hasHeader = looksLikeHeader(headers);
  if (hasHeader) startRow = 1;

  const cols = hasHeader ? detectColumns(headers) : { date: -1, description: -1, type: -1, amount: -1, cargo: -1, abono: -1, category: -1 };

  if (cols.date === -1 && cols.amount === -1 && cols.cargo === -1 && cols.abono === -1) {
    if (isXlsx) throw new Error('No se encontraron columnas de monto/fecha. Verifica que el archivo tenga filas con datos.');
    throw new Error("No se pudieron reconocer las columnas del archivo. Asegúrate de que tenga una columna de monto y una de fecha (ej. Fecha, Monto).");
  }

  const items = [];
  let skipped = 0;
  for (let r = startRow; r < rows.length; r += 1) {
    const cells = rows[r] || [];
    if (cells.every((c) => String(c ?? '').trim() === '')) continue;
    const item = classifyRow(cells, cols);
    if (!item) {
      skipped += 1;
      continue;
    }
    items.push(item);
  }

  if (items.length === 0) {
    throw new Error('No se encontraron movimientos válidos en el archivo.');
  }

  const dates = items.map((i) => i.date).filter(Boolean).sort();
  return {
    ext: isXlsx ? 'xlsx' : 'csv',
    items,
    total: items.length,
    skipped,
    fromDate: dates[0] || '',
    toDate: dates[dates.length - 1] || '',
  };
}

export async function createTransactionsMany(userId, items) {
  if (!userId) throw new Error('Sesión no iniciada');
  const rows = items.map((it) => ({
    id: generateId(),
    user_id: userId,
    type: it.type,
    amount: Number(it.amount) || 0,
    category: it.category || 'otros',
    description: it.description || '',
    date: it.date || new Date().toISOString().slice(0, 10),
    payment_method: '',
    note: 'Importado desde archivo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  return safeQuery(async () => {
    const { data, error } = await supabase.from('transactions').insert(rows).select();
    if (error) throw error;
    return data || [];
  });
}