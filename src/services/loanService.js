import { supabase } from '../config/supabase';
import { loanToMap, loanFromMap } from '../models/Loan';
import { safeQuery } from './supabaseHelper';

export async function getLoans(userId) {
  return safeQuery(async () => {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(loanFromMap);
  });
}

export async function createLoan(loan) {
  return safeQuery(async () => {
    const map = loanToMap(loan);
    const { data, error } = await supabase.from('loans').insert(map).select().single();
    if (error) throw error;
    return loanFromMap(data);
  });
}

export async function updateLoan(loan) {
  return safeQuery(async () => {
    const map = loanToMap(loan);
    const { data, error } = await supabase
      .from('loans')
      .update(map)
      .eq('id', loan.id)
      .select()
      .single();
    if (error) throw error;
    return loanFromMap(data);
  });
}

export async function deleteLoan(id) {
  return safeQuery(async () => {
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) throw error;
  });
}
