'use client';

import { create } from 'zustand';

export type Goal = {
  id: string;
  label: string;
  progressPct: number;
  sortOrder: number;
};

export type ActiveProgram = {
  id: string;
  name: string;
  totalWeeks: number;
  currentWeek: number;
};

type PlanState = {
  goals: Goal[];
  program: ActiveProgram | null;
  goalsLoaded: boolean;
  programLoaded: boolean;
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, data: Partial<Omit<Goal, 'id'>>) => void;
  removeGoal: (id: string) => void;
  setProgram: (program: ActiveProgram | null) => void;
};

export const usePlanStore = create<PlanState>()((set) => ({
  goals: [],
  program: null,
  goalsLoaded: false,
  programLoaded: false,
  setGoals: (goals) => set({ goals, goalsLoaded: true }),
  addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal] })),
  updateGoal: (id, data) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...data } : g)) })),
  removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
  setProgram: (program) => set({ program, programLoaded: true }),
}));
