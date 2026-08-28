import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as budgetService from '../services/budgetService';

const BudgetContext = createContext();

export function BudgetProvider({ children }) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadBudgets = useCallback(async (month, year) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await budgetService.getBudgets(user.id, month, year);
      setBudgets(data);
    } catch (e) {
      console.error('Error loading budgets:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addBudget = useCallback(async (budget) => {
    const created = await budgetService.createBudget(budget);
    setBudgets((prev) => [created, ...prev]);
    return created;
  }, []);

  const editBudget = useCallback(async (budget) => {
    const updated = await budgetService.updateBudget(budget);
    setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    return updated;
  }, []);

  const removeBudget = useCallback(async (id) => {
    await budgetService.deleteBudget(id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <BudgetContext.Provider value={{ budgets, loading, loadBudgets, addBudget, editBudget, removeBudget }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgets() {
  return useContext(BudgetContext);
}
