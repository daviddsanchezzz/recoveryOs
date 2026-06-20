'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityType, MuscleGroup } from './recovery-store';

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
  muscleGroups?: MuscleGroup[];
};

type PlanState = {
  goals: Goal[];
  program: ActiveProgram | null;
  goalsLoaded: boolean;
  programLoaded: boolean;
  weekPlan: Record<string, PlanEntry[]>;    // YYYY-MM-DD → entries for that day
  template: Record<number, PlanEntry[]>;    // 0=Mon … 6=Sun → recurring entries

  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, data: Partial<Omit<Goal, 'id'>>) => void;
  removeGoal: (id: string) => void;
  setProgram: (program: ActiveProgram | null) => void;

  addPlanEntry: (date: string, entry: PlanEntry) => void;
  removePlanEntry: (date: string, index: number) => void;

  addTemplateEntry: (dayIndex: number, entry: PlanEntry) => void;
  removeTemplateEntry: (dayIndex: number, index: number) => void;
  updateTemplateEntry: (dayIndex: number, index: number, entry: PlanEntry) => void;
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      goals: [],
      program: null,
      goalsLoaded: false,
      programLoaded: false,
      weekPlan: {},
      template: {},

      setGoals: (goals) => set({ goals, goalsLoaded: true }),
      addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal] })),
      updateGoal: (id, data) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...data } : g)) })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      setProgram: (program) => set({ program, programLoaded: true }),

      addPlanEntry: (date, entry) =>
        set((s) => ({
          weekPlan: { ...s.weekPlan, [date]: [...(s.weekPlan[date] ?? []), entry] },
        })),
      removePlanEntry: (date, index) =>
        set((s) => ({
          weekPlan: { ...s.weekPlan, [date]: (s.weekPlan[date] ?? []).filter((_, i) => i !== index) },
        })),

      addTemplateEntry: (dayIndex, entry) =>
        set((s) => ({
          template: { ...s.template, [dayIndex]: [...(s.template[dayIndex] ?? []), entry] },
        })),
      removeTemplateEntry: (dayIndex, index) =>
        set((s) => ({
          template: {
            ...s.template,
            [dayIndex]: (s.template[dayIndex] ?? []).filter((_, i) => i !== index),
          },
        })),
      updateTemplateEntry: (dayIndex, index, entry) =>
        set((s) => ({
          template: {
            ...s.template,
            [dayIndex]: (s.template[dayIndex] ?? []).map((e, i) => (i === index ? entry : e)),
          },
        })),
    }),
    {
      name: 'recoveryos-plan-v1',
      partialize: (state) => ({ weekPlan: state.weekPlan, template: state.template }),
    },
  ),
);
