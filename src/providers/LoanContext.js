import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as loanService from '../services/loanService';

const LoanContext = createContext();

export function LoanProvider({ children }) {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLoans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await loanService.getLoans(user.id);
      setLoans(data);
    } catch (e) {
      console.error('Error loading loans:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addLoan = useCallback(async (loan) => {
    const created = await loanService.createLoan(loan);
    setLoans((prev) => [created, ...prev]);
    return created;
  }, []);

  const editLoan = useCallback(async (loan) => {
    const updated = await loanService.updateLoan(loan);
    setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    return updated;
  }, []);

  const removeLoan = useCallback(async (id) => {
    await loanService.deleteLoan(id);
    setLoans((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const registerPayment = useCallback(async (loan, payment) => {
    const paid = (Number(loan.paidAmount) || 0) + (Number(payment) || 0);
    const next = { ...loan, paidAmount: Math.max(0, Math.min(paid, Number(loan.amount) || paid)) };
    const updated = await loanService.updateLoan(next);
    setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    return updated;
  }, []);

  return (
    <LoanContext.Provider value={{ loans, loading, loadLoans, addLoan, editLoan, removeLoan, registerPayment }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  return useContext(LoanContext);
}
