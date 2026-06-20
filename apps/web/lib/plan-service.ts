import { usePlanStore } from '../stores/plan-store';
import { toast } from '../stores/toast-store';
import { getJson, postJson, patchJson, deleteJson } from './api';
import type { Goal, ActiveProgram } from '../stores/plan-store';

type ServerGoal = { id: string; label: string; progressPct: number; sortOrder: number };
type ServerProgram = { id: string; name: string; totalWeeks: number; currentWeek: number } | null;

export const PlanService = {
  async loadGoals(userId: string): Promise<void> {
    try {
      const rows = await getJson<ServerGoal[]>(`/plan/${userId}/goals`);
      usePlanStore.getState().setGoals(
        rows.map((r) => ({ id: r.id, label: r.label, progressPct: r.progressPct, sortOrder: r.sortOrder })),
      );
    } catch {
      usePlanStore.getState().setGoals([]); // mark as loaded even on error
    }
  },

  async loadProgram(userId: string): Promise<void> {
    try {
      const data = await getJson<ServerProgram>(`/plan/${userId}/program`);
      usePlanStore.getState().setProgram(
        data
          ? { id: data.id, name: data.name, totalWeeks: data.totalWeeks, currentWeek: data.currentWeek }
          : null,
      );
    } catch {
      usePlanStore.getState().setProgram(null); // mark as loaded even on error
    }
  },

  async createGoal(userId: string, label: string, progressPct = 0): Promise<void> {
    try {
      const goal = await postJson<ServerGoal>('/plan/goals', { userId, label, progressPct });
      usePlanStore.getState().addGoal({ id: goal.id, label: goal.label, progressPct: goal.progressPct, sortOrder: goal.sortOrder });
      toast.success('Objetivo añadido');
    } catch {
      toast.error('No se pudo guardar el objetivo');
    }
  },

  async updateGoal(id: string, data: Partial<Omit<Goal, 'id'>>): Promise<void> {
    usePlanStore.getState().updateGoal(id, data);
    try {
      await patchJson(`/plan/goals/${id}`, data);
    } catch {
      // optimistic — no rollback in V1
    }
  },

  async deleteGoal(id: string): Promise<void> {
    usePlanStore.getState().removeGoal(id);
    try {
      await deleteJson(`/plan/goals/${id}`);
    } catch {
      toast.error('No se pudo eliminar el objetivo');
    }
  },

  async createProgram(userId: string, name: string, totalWeeks: number): Promise<void> {
    try {
      const program = await postJson<ServerProgram & { id: string }>('/plan/program', { userId, name, totalWeeks });
      if (program) {
        usePlanStore.getState().setProgram({
          id: program.id,
          name: program.name,
          totalWeeks: program.totalWeeks,
          currentWeek: program.currentWeek,
        });
      }
      toast.success('Programa creado');
    } catch {
      toast.error('No se pudo crear el programa');
    }
  },
};
