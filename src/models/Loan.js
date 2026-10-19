import { generateId } from '../utils/generateId';

export const LOAN_DIRECTIONS = {
  lent: { label: 'Me deben', short: 'Por cobrar', verb: 'Presté' },
  borrowed: { label: 'Debo', short: 'Por pagar', verb: 'Me prestaron' },
};

export function loanFromMap(map) {
  return {
    id: map.id || generateId(),
    userId: map.user_id,
    direction: map.direction === 'borrowed' ? 'borrowed' : 'lent',
    counterparty: map.counterparty || '',
    amount: Number(map.amount) || 0,
    paidAmount: Number(map.paid_amount) || 0,
    date: map.date,
    dueDate: map.due_date || null,
    note: map.note || '',
    createdAt: map.created_at,
    updatedAt: map.updated_at,
  };
}

export function loanToMap(loan) {
  return {
    id: loan.id,
    user_id: loan.userId,
    direction: loan.direction,
    counterparty: loan.counterparty || '',
    amount: Number(loan.amount) || 0,
    paid_amount: Number(loan.paidAmount) || 0,
    date: loan.date || new Date().toISOString(),
    due_date: loan.dueDate || null,
    note: loan.note || '',
    created_at: loan.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function createNewLoan(userId) {
  return {
    id: generateId(),
    userId,
    direction: 'lent',
    counterparty: '',
    amount: 0,
    paidAmount: 0,
    date: new Date().toISOString(),
    dueDate: null,
    note: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function loanOutstanding(loan) {
  return Math.max(0, (Number(loan.amount) || 0) - (Number(loan.paidAmount) || 0));
}

export function isLoanSettled(loan) {
  return loanOutstanding(loan) <= 0;
}

export function loanProgress(loan) {
  const amount = Number(loan.amount) || 0;
  if (amount <= 0) return 0;
  return Math.min(100, ((Number(loan.paidAmount) || 0) / amount) * 100);
}

// Efecto neto en el saldo disponible: lo que me deben resta (dinero que salió),
// lo que debo suma (dinero que entró). Al abonar se revierte de a pocos.
export function loansNetEffect(loans) {
  return (loans || []).reduce((sum, l) => {
    const out = loanOutstanding(l);
    return l.direction === 'borrowed' ? sum + out : sum - out;
  }, 0);
}

export function loansTotals(loans) {
  let porCobrar = 0;
  let porPagar = 0;
  (loans || []).forEach((l) => {
    const out = loanOutstanding(l);
    if (l.direction === 'borrowed') porPagar += out;
    else porCobrar += out;
  });
  return { porCobrar, porPagar };
}
