import { Platform } from 'react-native';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { getCategoryInfo } from '../constants/constants';

export const TRANSFER_FORMATS = ['csv', 'xlsx', 'pdf', 'backup'];

function transactionRows(transactions) {
  return (transactions || []).map((tx) => {
    const date = tx.date ? new Date(tx.date) : null;
    const fecha = date ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` : '';
    const hora = date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';
    return {
      Fecha: fecha,
      Hora: hora,
      Tipo: tx.type === 'income' ? 'Ingreso' : 'Gasto',
      Categoría: (getCategoryInfo(tx.category, tx.type) || {}).label || tx.category || '',
      Descripción: tx.description || '',
      'Monto (PEN)': Number(tx.amount) || 0,
      'Método de pago': tx.paymentMethod || '',
      Nota: tx.note || '',
    };
  });
}

function downloadBlob(filename, blob) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return { downloaded: false, reason: 'Solo disponible en el navegador' };
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { downloaded: true };
}

function stamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
}

export function exportTransactionsCsv(transactions) {
  const rows = transactionRows(transactions);
  const headers = ['Fecha', 'Hora', 'Tipo', 'Categoría', 'Descripción', 'Monto (PEN)', 'Método de pago', 'Nota'];
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  rows.forEach((r) => lines.push(headers.map((h) => escape(r[h])).join(',')));
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  return downloadBlob(`movimientos_${stamp()}.csv`, blob);
}

export function exportTransactionsXlsx(transactions) {
  const rows = transactionRows(transactions);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 }, { wch: 7 }, { wch: 8 }, { wch: 18 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 24 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return downloadBlob(`movimientos_${stamp()}.xlsx`, blob);
}

export function exportTransactionsPdf(transactions) {
  const rows = transactionRows(transactions);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFontSize(16);
  doc.text('Reporte de Movimientos', margin, 45);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Generado: ${new Date().toLocaleString('es-PE')} · Total de registros: ${rows.length}`,
    margin,
    62
  );
  doc.setTextColor(0);

  let income = 0;
  let expense = 0;
  rows.forEach((r) => {
    const amt = Number(r['Monto (PEN)']) || 0;
    if (r.Tipo === 'Ingreso') income += amt;
    else expense += amt;
  });

  doc.setFontSize(11);
  doc.text(`Total ingresos: S/ ${income.toFixed(2)}`, margin, 82);
  doc.text(`Total gastos:    S/ ${expense.toFixed(2)}`, margin, 98);
  doc.setDrawColor(200);
  doc.line(margin, 108, pageWidth - margin, 108);

  const colX = {
    Fecha: margin,
    Tipo: margin + 70,
    'Descripción': margin + 130,
    'Monto (PEN)': pageWidth - margin - 90,
  };
  const colW = {
    Fecha: 70,
    Tipo: 60,
    'Descripción': pageWidth - margin - 130 - 90,
    'Monto (PEN)': 90,
  };

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha', colX.Fecha, 124);
  doc.text('Tipo', colX.Tipo, 124);
  doc.text('Descripción', colX['Descripción'], 124);
  doc.text('Monto', colX['Monto (PEN)'], 124);
  doc.setFont('helvetica', 'normal');

  let y = 140;
  for (const r of rows) {
    if (y > 780) {
      doc.addPage();
      y = 60;
    }
    const descr = (r['Descripción'] || '').slice(0, 60) || '—';
    doc.text(String(r.Fecha), colX.Fecha, y);
    doc.text(r.Tipo, colX.Tipo, y);
    doc.text(descr, colX['Descripción'], y);
    doc.text(`S/ ${Number(r['Monto (PEN)']).toFixed(2)}`, colX['Monto (PEN)'], y);
    y += 18;
  }

  return downloadBlob(`movimientos_${stamp()}.pdf`, doc.output('blob'));
}

export function buildBackup({ userId, transactions, budgets, savingGoals, initialBalance }) {
  const asMaps = (list, toMap) => (list || []).map(toMap);
  return {
    app: 'GestionFinanciero',
    type: 'backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    owner: userId || null,
    initialBalance: Number(initialBalance) || 0,
    transactions: asMaps(transactions, (t) => t),
    budgets: asMaps(budgets, (b) => b),
    savingGoals: asMaps(savingGoals, (g) => g),
  };
}

export function exportBackup(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  return downloadBlob(`respaldo_gestion_financiero_${stamp()}.json`, blob);
}

export function parseBackup(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.type !== 'backup') {
    throw new Error('El archivo no es un respaldo válido de Gestión Financiera');
  }
  return parsed;
}

export function pickJsonFile() {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      reject(new Error('Solo disponible en el navegador'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(parseBackup(String(reader.result)));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsText(file);
    };
    input.oncancel = () => reject(new Error('Importación cancelada'));
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

export { downloadBlob };
