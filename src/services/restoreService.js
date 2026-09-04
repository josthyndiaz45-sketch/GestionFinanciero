import { supabase } from '../config/supabase';
import { safeQuery } from './supabaseHelper';
import { generateId } from '../utils/generateId';

function normalize(objects, currentUserId, fieldMap) {
  return (objects || []).map((o) => {
    const row = {};
    for (const [key, target] of fieldMap) {
      let value = o[key];
      if (key === 'userId') value = currentUserId;
      if (value === undefined) continue;
      row[target] = value;
    }
    row.user_id = currentUserId;
    if (!row.id) row.id = generateId();
    row.created_at = o.createdAt || o.created_at || new Date().toISOString();
    return row;
  });
}

const TX_FIELDS = [
  ['id', 'id'],
  ['userId', 'user_id'],
  ['type', 'type'],
  ['amount', 'amount'],
  ['category', 'category'],
  ['description', 'description'],
  ['date', 'date'],
  ['paymentMethod', 'payment_method'],
  ['note', 'note'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at'],
];

const BUDGET_FIELDS = [
  ['id', 'id'],
  ['userId', 'user_id'],
  ['category', 'category'],
  ['monthlyLimit', 'monthly_limit'],
  ['month', 'month'],
  ['year', 'year'],
  ['createdAt', 'created_at'],
];

const GOAL_FIELDS = [
  ['id', 'id'],
  ['userId', 'user_id'],
  ['name', 'name'],
  ['targetAmount', 'target_amount'],
  ['currentAmount', 'current_amount'],
  ['deadline', 'deadline'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at'],
];

export async function clearUserFinancialData(userId) {
  const tables = ['transactions', 'budgets', 'saving_goals'];
  for (const table of tables) {
    await safeQuery(() => supabase.from(table).delete().eq('user_id', userId));
  }
  await safeQuery(() => supabase.from('user_settings').delete().eq('user_id', userId));
}

export async function restoreBackup(backup, currentUserId) {
  const txRows = normalize(backup.transactions, currentUserId, TX_FIELDS);
  const budgetRows = normalize(backup.budgets, currentUserId, BUDGET_FIELDS);
  const goalRows = normalize(backup.savingGoals, currentUserId, GOAL_FIELDS);

  const results = { transactions: 0, budgets: 0, savingGoals: 0, initialBalance: null };

  if (txRows.length > 0) {
    const { error } = await safeQuery(() => supabase.from('transactions').insert(txRows));
    if (error) throw new Error(`Error al restaurar movimientos: ${error.message}`);
    results.transactions = txRows.length;
  }

  if (budgetRows.length > 0) {
    const { error } = await safeQuery(() => supabase.from('budgets').insert(budgetRows));
    if (error) throw new Error(`Error al restaurar presupuestos: ${error.message}`);
    results.budgets = budgetRows.length;
  }

  if (goalRows.length > 0) {
    const { error } = await safeQuery(() => supabase.from('saving_goals').insert(goalRows));
    if (error) throw new Error(`Error al restaurar metas: ${error.message}`);
    results.savingGoals = goalRows.length;
  }

  if (typeof backup.initialBalance === 'number' && !Number.isNaN(backup.initialBalance)) {
    const { error } = await safeQuery(() =>
      supabase.from('user_settings').upsert(
        { user_id: currentUserId, initial_balance: Number(backup.initialBalance), updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    );
    if (error) throw new Error(`Error al restaurar el saldo inicial: ${error.message}`);
    results.initialBalance = Number(backup.initialBalance);
  }

  return results;
}
