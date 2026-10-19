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

const EMPTY_COLS = { date: -1, description: -1, type: -1, amount: -1, cargo: -1, abono: -1, category: -1, origin: -1, destination: -1, message: -1 };

function detectColumns(headers) {
  const cols = { ...EMPTY_COLS };
  headers.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (!n) return;
    if (cols.date === -1 && /(fech|date|dia)/.test(n)) cols.date = i;
    if (cols.type === -1 && /(tipo|type|naturaleza|transaccion)/.test(n)) cols.type = i;
    if (cols.cargo === -1 && /(cargo|debe|retiro|egreso|salida|debito|debit)/.test(n)) cols.cargo = i;
    if (cols.abono === -1 && /(abono|haber|ingreso|deposito|entrada|credito|credit)/.test(n)) cols.abono = i;
    if (cols.amount === -1 && /(monto|importe|amount|valor|total|saldo)/.test(n)) cols.amount = i;
    if (cols.category === -1 && /(categor|category|rubro|grupo)/.test(n)) cols.category = i;
    if (cols.message === -1 && /(mensaje|message|glosa|asunto|motivo)/.test(n)) cols.message = i;
    if (cols.origin === -1 && /(origen|origin|remitente|emisor)/.test(n)) cols.origin = i;
    if (cols.destination === -1 && /(destino|destinatario|receptor|beneficiario)/.test(n)) cols.destination = i;
    if (cols.description === -1 && cols.message !== i && /(descripcion|description|concepto|detalle|nota|comercio|observacion|referencia|ref)/.test(n)) cols.description = i;
  });
  return cols;
}

function scoreHeaderRow(cells) {
  const cols = detectColumns(cells);
  let score = 0;
  if (cols.date !== -1) score += 2;
  if (cols.amount !== -1 || cols.cargo !== -1 || cols.abono !== -1) score += 2;
  if (cols.description !== -1 || cols.message !== -1) score += 1;
  if (cols.type !== -1) score += 1;
  const hints = /(fech|date|monto|importe|amount|descripcion|concepto|mensaje|tipo|origen|destino|abono|cargo|detalle|nota|saldo)/;
  score += cells.filter((c) => hints.test(normalizeHeader(c))).length * 0.1;
  return score;
}

function findHeaderRow(rows) {
  const limit = Math.min(rows.length, 25);
  let best = -1;
  let bestScore = 0;
  for (let r = 0; r < limit; r += 1) {
    const cells = (rows[r] || []).map((c) => String(c ?? ''));
    if (!cells.some((c) => c.trim() !== '')) continue;
    const score = scoreHeaderRow(cells);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= 4 ? best : -1;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toLocalIsoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildDate(year, month, day) {
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDate(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return toLocalIsoDate(value);
  }
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`;
    return null;
  }
  const s = String(value).trim();
  if (!s) return null;

  // ISO: YYYY-MM-DD (con o sin hora)
  const iso = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) {
    const r = buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (r) return r;
  }

  // Formato Perú/Yape: DD/MM/YYYY [HH:MM[:SS]]
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/);
  if (dmy) {
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    const r = buildDate(y, Number(dmy[2]), Number(dmy[1]));
    if (r) return r;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return toLocalIsoDate(parsed);
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

function inferSelf(rows, cols, startRow) {
  if (cols.origin === -1 && cols.destination === -1) return null;
  const counts = {};
  for (let r = startRow; r < rows.length; r += 1) {
    const cells = rows[r] || [];
    [cols.origin, cols.destination].forEach((ci) => {
      if (ci === -1) return;
      const v = normalizeHeader(cells[ci]);
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
  }
  let best = null;
  let bestCount = 0;
  Object.keys(counts).forEach((k) => {
    if (counts[k] > bestCount) {
      bestCount = counts[k];
      best = k;
    }
  });
  return bestCount >= 2 ? best : null;
}

function inferDirectionFromSides(cells, cols, self) {
  if (!self || (cols.origin === -1 && cols.destination === -1)) return null;
  const origin = cols.origin !== -1 ? normalizeHeader(cells[cols.origin]) : '';
  const destination = cols.destination !== -1 ? normalizeHeader(cells[cols.destination]) : '';
  if (origin === self && destination !== self) return 'expense';
  if (destination === self && origin !== self) return 'income';
  return null;
}

function classifyRow(cells, cols, self) {
  let amount = null;
  let type = null;

  let typeFromCol = null;
  if (cols.type !== -1) {
    const t = normalizeHeader(cells[cols.type]);
    if (/(te pag|te yape|recib|recibi|cobr|ingres|income|abono|deposit|credito|credit|entrada|devolucion|reembolso|recarga)/.test(t)) typeFromCol = 'income';
    else if (/(pagaste|envi|enviaste|yapeaste|pago|pagar|compra|gasto|egreso|expense|debito|debit|retiro|salida|cargo|consumo)/.test(t)) typeFromCol = 'expense';
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
      type = typeFromCol || inferDirectionFromSides(cells, cols, self) || (raw < 0 ? 'expense' : 'income');
    }
  }

  if (amount === null || amount === 0) return null;

  let description = '';
  if (cols.message !== -1) description = String(cells[cols.message] ?? '').trim();
  if (!description && cols.description !== -1) description = String(cells[cols.description] ?? '').trim();
  if (!description && cols.message === -1 && cols.destination !== -1) description = String(cells[cols.destination] ?? '').trim();
  if (!description && cols.message === -1 && cols.origin !== -1) description = String(cells[cols.origin] ?? '').trim();
  if (!description && cols.message === -1 && cols.description === -1 && cols.origin === -1 && cols.destination === -1 && cols.type !== -1) {
    const t = normalizeHeader(cells[cols.type]);
    if (t && !/ingreso|gasto|income|expense|abono|cargo|credito|debito/.test(t)) {
      description = String(cells[cols.type] ?? '').trim();
    }
  }
  if (!description) description = 'Sin mensaje';

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
  if (!date) date = toLocalIsoDate(new Date());

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
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('El archivo no contiene hojas de datos');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const isXlsx = /\.(xlsx|xls)$/i.test(fileName || '');

  let startRow = 0;
  const headerRow = findHeaderRow(rows);
  const hasHeader = headerRow !== -1;
  if (hasHeader) startRow = headerRow + 1;

  const headers = hasHeader ? (rows[headerRow] || []).map((c) => String(c ?? '')) : [];
  const cols = hasHeader ? detectColumns(headers) : { ...EMPTY_COLS };

  if (cols.date === -1 && cols.amount === -1 && cols.cargo === -1 && cols.abono === -1) {
    throw new Error("No se pudieron reconocer las columnas del archivo. Se esperaba una columna de fecha (Fecha / Fecha operación) y una de monto (Monto / Importe). También se admite el formato de Yape: Tipo de Transacción, Origen, Destino, Monto, Mensaje, Fecha operación.");
  }

  const self = inferSelf(rows, cols, startRow);

  const items = [];
  let skipped = 0;
  for (let r = startRow; r < rows.length; r += 1) {
    const cells = rows[r] || [];
    if (cells.every((c) => String(c ?? '').trim() === '')) continue;
    const item = classifyRow(cells, cols, self);
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
    date: it.date || toLocalIsoDate(new Date()),
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