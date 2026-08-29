import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/constants';

const CategoryContext = createContext();
const KEY = '@categories_managed';

const DEFAULT = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
};

const PALETTE = ['#3B82F6', '#F97316', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F59E0B', '#10B981', '#E11D48', '#0EA5E9'];

export function CategoryProvider({ children }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try { setState(JSON.parse(raw)); } catch (_) { /* ignore */ }
      }
    });
  }, []);

  const persist = async (next) => {
    setState(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const ensure = () => state || DEFAULT;

  const getCategories = useCallback((type) => {
    const list = state ? state[type] : DEFAULT[type];
    return list || [];
  }, [state]);

  const addCategory = useCallback(async (type, cat) => {
    const base = ensure();
    const current = base[type];
    if (current.some((c) => c.name === cat.name)) throw new Error('Esa categoría ya existe');
    const next = { ...base, [type]: [...current, cat] };
    await persist(next);
  }, [state]);

  const removeCategory = useCallback(async (type, name) => {
    const base = ensure();
    const next = { ...base, [type]: base[type].filter((c) => c.name !== name) };
    await persist(next);
  }, [state]);

  const pickColor = useCallback((type) => {
    const count = (ensure()[type] || []).length;
    return PALETTE[count % PALETTE.length];
  }, [state]);

  return (
    <CategoryContext.Provider value={{ getCategories, addCategory, removeCategory, pickColor }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoryContext);
}