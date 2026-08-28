import { generateId } from '../utils/generateId';

export function savingGoalFromMap(map) {
  return {
    id: map.id || generateId(),
    userId: map.user_id,
    name: map.name,
    targetAmount: map.target_amount,
    currentAmount: map.current_amount || 0,
    deadline: map.deadline || null,
    createdAt: map.created_at,
    updatedAt: map.updated_at,
  };
}

export function savingGoalToMap(goal) {
  return {
    id: goal.id,
    user_id: goal.userId,
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount || 0,
    deadline: goal.deadline || null,
    created_at: goal.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function createNewSavingGoal(userId) {
  return {
    id: generateId(),
    userId,
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
