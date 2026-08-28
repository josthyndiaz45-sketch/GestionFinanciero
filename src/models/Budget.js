import { generateId } from '../utils/generateId';

export function budgetFromMap(map) {
  return {
    id: map.id || generateId(),
    userId: map.user_id,
    category: map.category,
    monthlyLimit: map.monthly_limit,
    month: map.month,
    year: map.year,
    createdAt: map.created_at,
  };
}

export function budgetToMap(budget) {
  return {
    id: budget.id,
    user_id: budget.userId,
    category: budget.category,
    monthly_limit: budget.monthlyLimit,
    month: budget.month,
    year: budget.year,
    created_at: budget.createdAt || new Date().toISOString(),
  };
}

export function createNewBudget(userId) {
  const now = new Date();
  return {
    id: generateId(),
    userId,
    category: '',
    monthlyLimit: 0,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    createdAt: new Date().toISOString(),
  };
}
