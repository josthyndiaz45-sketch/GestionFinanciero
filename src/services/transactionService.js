import { supabase } from '../config/supabase';
import { transactionToMap, transactionFromMap } from '../models/Transaction';
import { safeQuery } from './supabaseHelper';

export async function getTransactions(userId, filters = {}) {
  return safeQuery(async () => {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (filters.type) query = query.eq('type', filters.type);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(transactionFromMap);
  });
}

export async function createTransaction(transaction) {
  return safeQuery(async () => {
    const map = transactionToMap(transaction);
    const { data, error } = await supabase.from('transactions').insert(map).select().single();
    if (error) throw error;
    return transactionFromMap(data);
  });
}

export async function updateTransaction(transaction) {
  return safeQuery(async () => {
    const map = transactionToMap(transaction);
    const { data, error } = await supabase
      .from('transactions')
      .update(map)
      .eq('id', transaction.id)
      .select()
      .single();
    if (error) throw error;
    return transactionFromMap(data);
  });
}

export async function deleteTransaction(id) {
  return safeQuery(async () => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  });
}

const IMPORT_NOTE = 'Importado desde archivo';

export async function getRecentImports(userId, sinceIso) {
  return safeQuery(async () => {
    let query = supabase
      .from('transactions')
      .select('id, date, created_at')
      .eq('user_id', userId)
      .eq('note', IMPORT_NOTE);
    if (sinceIso) query = query.gte('created_at', sinceIso);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

export async function deleteImportedTransactions(userId, sinceIso) {
  return safeQuery(async () => {
    let query = supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('note', IMPORT_NOTE);
    if (sinceIso) query = query.gte('created_at', sinceIso);
    const { data, error } = await query.select('id');
    if (error) throw error;
    return (data || []).length;
  });
}
