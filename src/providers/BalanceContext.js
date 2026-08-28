import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { safeQuery } from '../services/supabaseHelper';
import { useAuth } from './AuthContext';

const BalanceContext = createContext();

export function BalanceProvider({ children }) {
  const { user } = useAuth();
  const [initialBalance, setInitialBalance] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoaded(false);
    (async () => {
      try {
        const { data, error } = await safeQuery(async () =>
          supabase
            .from('user_settings')
            .select('initial_balance')
            .eq('user_id', user.id)
            .maybeSingle()
        );
        if (error) throw error;
        if (active) setInitialBalance(data ? Number(data.initial_balance) || 0 : 0);
      } catch (e) {
        console.error('Error loading initial balance:', e);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [user?.id]);

  const updateInitialBalance = useCallback(async (amount) => {
    setInitialBalance(amount);
    if (!user) return;
    try {
      await safeQuery(async () =>
        supabase
          .from('user_settings')
          .upsert(
            { user_id: user.id, initial_balance: amount, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
      );
    } catch (e) {
      console.error('Error saving initial balance:', e);
    }
  }, [user]);

  return (
    <BalanceContext.Provider value={{ initialBalance, updateInitialBalance, loaded }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  return useContext(BalanceContext);
}