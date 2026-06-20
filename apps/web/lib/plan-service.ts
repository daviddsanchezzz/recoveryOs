import { usePlanStore } from '../stores/plan-store';
import { toast } from '../stores/toast-store';
import { getJson, postJson, patchJson, deleteJson, putJson } from './api';
import type { Goal, ActiveProgram, PlanEntry } from '../stores/plan-store';

type ServerGoal = { id: string; label: string; progressPct: number; sortOrder: number };
type ServerProgram = { id: string; name: string; totalWeeks: number; currentWeek: number } | null;

// ── Internal helpers ──────────────────────────────────────────────────────────

async function saveWeekPlanDay(date: string, entries: PlanEntry[]): Promise<void> {
  try {
    await putJson<unknown>(`/plan/week-plan/${date}`, { entries });
  } catch {
    // optimistic — no rollback in V1
  }
}

async function saveTemplateDay(dayIndex: number, entries: PlanEntry[]): Promise<void> {
  try {
    await putJson<unknown>(`/plan/template/${dayIndex}`, { entries });
  } catch {
    // optimistic — no rollback in V1
  }
}

// ── Public service ────────────────────────────────────────────────────────────

export const PlanService = {
  // ── Goals ──────────────────────────────────────────────────────────────────

  async loadGoals(userId: string): Promise<void> {
    try {
      const rows = await getJson<ServerGoal[]>(`/plan/${userId}/goals`);
      usePlanStore.getState().setGoals(
        rows.map((r) => ({ id: r.id, label: r.label, progressPct: r.progressPct, sortOrder: r.sortOrder })),
      );
    } catch {
      usePlanStore.getState().setGoals([]);
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
      usePlanStore.getState().setProgram(null);
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

  // ── Week Plan ───────────────────────────────────────────────────────────────

  async loadWeekPlan(userId: string): Promise<void> {
    try {
      const dbData = await getJson<Record<string, PlanEntry[]>>(`/plan/${userId}/week-plan`);
      const store = usePlanStore.getState();

      if (Object.keys(dbData).length > 0) {
        store.setWeekPlan(dbData);
      } else {
        // Migrate existing localStorage data to DB (one-time)
        const localData = store.weekPlan;
        const hasLocal = Object.values(localData).some((arr) => arr.length > 0);
        if (hasLocal) {
          void Promise.all(
            Object.entries(localData)
              .filter(([, entries]) => entries.length > 0)
              .map(([date, entries]) => saveWeekPlanDay(date, entries)),
          );
        }
        store.setWeekPlan(localData);
      }
    } catch {
      usePlanStore.getState().setWeekPlan(usePlanStore.getState().weekPlan);
    }
  },

  addPlanEntry(date: string, entry: PlanEntry): void {
    usePlanStore.getState().addPlanEntry(date, entry);
    void saveWeekPlanDay(date, usePlanStore.getState().weekPlan[date] ?? []);
  },

  removePlanEntry(date: string, index: number): void {
    usePlanStore.getState().removePlanEntry(date, index);
    void saveWeekPlanDay(date, usePlanStore.getState().weekPlan[date] ?? []);
  },

  // ── Template ────────────────────────────────────────────────────────────────

  async loadTemplate(userId: string): Promise<void> {
    try {
      const raw = await getJson<Record<string, PlanEntry[]>>(`/plan/${userId}/template`);
      // Keys come back as strings from JSON — convert to numbers
      const dbData: Record<number, PlanEntry[]> = {};
      for (const [k, v] of Object.entries(raw)) dbData[Number(k)] = v;

      const store = usePlanStore.getState();

      if (Object.keys(dbData).length > 0) {
        store.setTemplate(dbData);
      } else {
        // Migrate existing localStorage template to DB (one-time)
        const localData = store.template;
        const hasLocal = Object.values(localData).some((arr) => arr.length > 0);
        if (hasLocal) {
          void Promise.all(
            Object.entries(localData)
              .filter(([, entries]) => entries.length > 0)
              .map(([idx, entries]) => saveTemplateDay(Number(idx), entries)),
          );
        }
        store.setTemplate(localData);
      }
    } catch {
      usePlanStore.getState().setTemplate(usePlanStore.getState().template);
    }
  },

  addTemplateEntry(dayIndex: number, entry: PlanEntry): void {
    usePlanStore.getState().addTemplateEntry(dayIndex, entry);
    void saveTemplateDay(dayIndex, usePlanStore.getState().template[dayIndex] ?? []);
  },

  removeTemplateEntry(dayIndex: number, index: number): void {
    usePlanStore.getState().removeTemplateEntry(dayIndex, index);
    void saveTemplateDay(dayIndex, usePlanStore.getState().template[dayIndex] ?? []);
  },

  updateTemplateEntry(dayIndex: number, index: number, entry: PlanEntry): void {
    usePlanStore.getState().updateTemplateEntry(dayIndex, index, entry);
    void saveTemplateDay(dayIndex, usePlanStore.getState().template[dayIndex] ?? []);
  },
};
