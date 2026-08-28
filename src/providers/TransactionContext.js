import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as transactionService from '../services/transactionService';

const TransactionContext = createContext();

export function TransactionProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTransactions = useCallback(async (filters = {}) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await transactionService.getTransactions(user.id, filters);
      setTransactions(data);
    } catch (e) {
      console.error('Error loading transactions:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addTransaction = useCallback(async (tx) => {
    const created = await transactionService.createTransaction(tx);
    setTransactions((prev) => [created, ...prev]);
    return created;
  }, []);

  const editTransaction = useCallback(async (tx) => {
    const updated = await transactionService.updateTransaction(tx);
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    return updated;
  }, []);

  const removeTransaction = useCallback(async (id) => {
    await transactionService.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TransactionContext.Provider
      value={{ transactions, loading, loadTransactions, addTransaction, editTransaction, removeTransaction }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  return useContext(TransactionContext);
}
