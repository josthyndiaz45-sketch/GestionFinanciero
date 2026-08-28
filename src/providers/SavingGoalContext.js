import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as savingGoalService from '../services/savingGoalService';

const SavingGoalContext = createContext();

export function SavingGoalProvider({ children }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await savingGoalService.getSavingGoals(user.id);
      setGoals(data);
    } catch (e) {
      console.error('Error loading saving goals:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addGoal = useCallback(async (goal) => {
    const created = await savingGoalService.createSavingGoal(goal);
    setGoals((prev) => [created, ...prev]);
    return created;
  }, []);

  const editGoal = useCallback(async (goal) => {
    const updated = await savingGoalService.updateSavingGoal(goal);
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    return updated;
  }, []);

  const removeGoal = useCallback(async (id) => {
    await savingGoalService.deleteSavingGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return (
    <SavingGoalContext.Provider value={{ goals, loading, loadGoals, addGoal, editGoal, removeGoal }}>
      {children}
    </SavingGoalContext.Provider>
  );
}

export function useSavingGoals() {
  return useContext(SavingGoalContext);
}
