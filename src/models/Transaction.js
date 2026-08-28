import { generateId } from '../utils/generateId';

export function transactionFromMap(map) {
  return {
    id: map.id || generateId(),
    userId: map.user_id,
    type: map.type,
    amount: map.amount,
    category: map.category,
    description: map.description,
    date: map.date,
    paymentMethod: map.payment_method || '',
    note: map.note || '',
    createdAt: map.created_at,
    updatedAt: map.updated_at,
  };
}

export function transactionToMap(tx) {
  return {
    id: tx.id,
    user_id: tx.userId,
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    description: tx.description,
    date: tx.date,
    payment_method: tx.paymentMethod || '',
    note: tx.note || '',
    created_at: tx.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function createNewTransaction(userId) {
  return {
    id: generateId(),
    userId,
    type: 'expense',
    amount: 0,
    category: '',
    description: '',
    date: new Date().toISOString(),
    paymentMethod: '',
    note: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
