import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as reminderService from '../services/reminderService';

const ReminderContext = createContext();

export function ReminderProvider({ children }) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReminders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await reminderService.getReminders(user.id);
      setReminders(data);
    } catch (e) {
      console.error('Error loading reminders:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addReminder = useCallback(async (reminder) => {
    if (!user) return;
    const created = await reminderService.createReminder({ ...reminder, userId: user.id });
    setReminders((prev) => [created, ...prev]);
    return created;
  }, [user]);

  const editReminder = useCallback(async (reminder) => {
    const updated = await reminderService.updateReminder({ ...reminder, userId: user.id });
    setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    return updated;
  }, [user]);

  const removeReminder = useCallback(async (id) => {
    await reminderService.deleteReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <ReminderContext.Provider value={{ reminders, loading, loadReminders, addReminder, editReminder, removeReminder }}>
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  return useContext(ReminderContext);
}