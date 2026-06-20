'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityType } from './recovery-store';

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

export type PlanEntry = {
  type: ActivityType;
  label: string;
  time?: string;
};

type PlanState = {
  goals: Goal[];
  program: ActiveProgram | null;
  goalsLoaded: boolean;
  programLoaded: boolean;
  // weekPlan: date string (YYYY-MM-DD) → planned activities for that day
  weekPlan: Record<string, PlanEntry[]>;

  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, data: Partial<Omit<Goal, 'id'>>) => void;
  removeGoal: (id: string) => void;
  setProgram: (program: ActiveProgram | null) => void;
  addPlanEntry: (date: string, entry: PlanEntry) => void;
  removePlanEntry: (date: string, index: number) => void;
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      goals: [],
      program: null,
      goalsLoaded: false,
      programLoaded: false,
      weekPlan: {},

      setGoals: (goals) => set({ goals, goalsLoaded: true }),
      addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal] })),
      updateGoal: (id, data) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...data } : g)) })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      setProgram: (program) => set({ program, programLoaded: true }),

      addPlanEntry: (date, entry) =>
        set((s) => ({
          weekPlan: {
            ...s.weekPlan,
            [date]: [...(s.weekPlan[date] ?? []), entry],
          },
        })),
      removePlanEntry: (date, index) =>
        set((s) => ({
          weekPlan: {
            ...s.weekPlan,
            [date]: (s.weekPlan[date] ?? []).filter((_, i) => i !== index),
          },
        })),
    }),
    {
      name: 'recoveryos-plan-v1',
      partialize: (state) => ({
        weekPlan: state.weekPlan,
      }),
    },
  ),
);
