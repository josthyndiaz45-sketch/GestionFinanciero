import { supabase } from '../config/supabase';
import { budgetToMap, budgetFromMap } from '../models/Budget';
import { safeQuery } from './supabaseHelper';

export async function getBudgets(userId, month, year) {
  return safeQuery(async () => {
    let query = supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (month) query = query.eq('month', month);
    if (year) query = query.eq('year', year);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(budgetFromMap);
  });
}

export async function createBudget(budget) {
  return safeQuery(async () => {
    const map = budgetToMap(budget);
    const { data, error } = await supabase.from('budgets').insert(map).select().single();
    if (error) throw error;
    return budgetFromMap(data);
  });
}

export async function updateBudget(budget) {
  return safeQuery(async () => {
    const map = budgetToMap(budget);
    const { data, error } = await supabase
      .from('budgets')
      .update(map)
      .eq('id', budget.id)
      .select()
      .single();
    if (error) throw error;
    return budgetFromMap(data);
  });
}

export async function deleteBudget(id) {
  return safeQuery(async () => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
  });
}
