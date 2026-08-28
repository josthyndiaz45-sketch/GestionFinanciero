import { supabase } from '../config/supabase';
import { savingGoalToMap, savingGoalFromMap } from '../models/SavingGoal';
import { safeQuery } from './supabaseHelper';

export async function getSavingGoals(userId) {
  return safeQuery(async () => {
    let query = supabase
      .from('saving_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(savingGoalFromMap);
  });
}

export async function createSavingGoal(goal) {
  return safeQuery(async () => {
    const map = savingGoalToMap(goal);
    const { data, error } = await supabase.from('saving_goals').insert(map).select().single();
    if (error) throw error;
    return savingGoalFromMap(data);
  });
}

export async function updateSavingGoal(goal) {
  return safeQuery(async () => {
    const map = savingGoalToMap(goal);
    const { data, error } = await supabase
      .from('saving_goals')
      .update(map)
      .eq('id', goal.id)
      .select()
      .single();
    if (error) throw error;
    return savingGoalFromMap(data);
  });
}

export async function deleteSavingGoal(id) {
  return safeQuery(async () => {
    const { error } = await supabase.from('saving_goals').delete().eq('id', id);
    if (error) throw error;
  });
}
