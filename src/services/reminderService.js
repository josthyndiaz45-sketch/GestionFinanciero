import { supabase } from '../config/supabase';
import { safeQuery } from './supabaseHelper';
import { generateId } from '../utils/generateId';

const REMINDERS_TABLE = 'reminders';

export function reminderToMap(reminder) {
  return {
    id: reminder.id,
    user_id: reminder.userId,
    name: reminder.name,
    amount: reminder.amount,
    day_of_month: reminder.dayOfMonth,
    end_year: reminder.endYear,
    indefinite: reminder.indefinite,
    paid_months: reminder.paidMonths || [],
    note: reminder.note || '',
    alert_timing: reminder.alertTiming ?? 0,
    sound: reminder.sound || 'default',
    notification_ids: reminder.notificationIds || [],
    updated_at: new Date().toISOString(),
  };
}

export function reminderFromMap(map) {
  return {
    id: map.id || generateId(),
    userId: map.user_id,
    name: map.name || '',
    amount: Number(map.amount) || 0,
    dayOfMonth: map.day_of_month || 1,
    endYear: map.end_year ?? null,
    indefinite: map.indefinite !== false,
    paidMonths: map.paid_months || [],
    note: map.note || '',
    alertTiming: map.alert_timing ?? 0,
    sound: map.sound || 'default',
    notificationIds: map.notification_ids || [],
    createdAt: map.created_at,
  };
}

export async function getReminders(userId) {
  return safeQuery(async () => {
    const { data, error } = await supabase
      .from(REMINDERS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(reminderFromMap);
  });
}

export async function createReminder(reminder) {
  return safeQuery(async () => {
    const { data, error } = await supabase.from(REMINDERS_TABLE).insert(reminderToMap(reminder)).select().single();
    if (error) throw error;
    return reminderFromMap(data);
  });
}

export async function updateReminder(reminder) {
  return safeQuery(async () => {
    const { data, error } = await supabase
      .from(REMINDERS_TABLE)
      .update(reminderToMap(reminder))
      .eq('id', reminder.id)
      .select()
      .single();
    if (error) throw error;
    return reminderFromMap(data);
  });
}

export async function deleteReminder(id) {
  return safeQuery(async () => {
    const { error } = await supabase.from(REMINDERS_TABLE).delete().eq('id', id);
    if (error) throw error;
  });
}

export function createReminderTemplate() {
  return {
    id: generateId(),
    name: '',
    amount: 0,
    dayOfMonth: new Date().getDate(),
    endYear: null,
    indefinite: true,
    paidMonths: [],
    note: '',
    alertTiming: 0,
    sound: 'default',
    notificationIds: [],
  };
}