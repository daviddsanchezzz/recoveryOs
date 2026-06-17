/**
 * RecoveryOS Service Layer
 *
 * All data operations go through here.
 * Currently wraps Zustand stores — replace with API calls when backend is ready.
 * Components import from this file, not directly from stores.
 */
import { useRecoveryStore } from '../stores/recovery-store';
import type { ActivityType, InjuryStatus } from '../stores/recovery-store';
import { todayIso } from './date';

export const RecoveryService = {
  // ─── Weight ───────────────────────────────────────────────
  logWeight(kg: number, date = todayIso()) {
    useRecoveryStore.getState().saveWeight(kg, date);
  },

  // ─── Activity ─────────────────────────────────────────────
  logActivity(data: {
    type: ActivityType;
    durationMinutes?: number;
    notes?: string;
    date?: string;
  }) {
    useRecoveryStore.getState().addActivity({
      type: data.type,
      durationMinutes: data.durationMinutes,
      notes: data.notes,
      date: data.date ?? todayIso(),
    });
  },

  // ─── Injury pain ──────────────────────────────────────────
  logPain(data: {
    injuryId: string;
    painLevel: number;
    didRehab: boolean;
    notes?: string;
    date?: string;
  }) {
    useRecoveryStore.getState().logInjuryPain({
      injuryId: data.injuryId,
      painLevel: data.painLevel,
      didRehab: data.didRehab,
      notes: data.notes,
      date: data.date ?? todayIso(),
    });
  },

  // ─── Full daily check-in ──────────────────────────────────
  saveCheckIn(data: Parameters<ReturnType<typeof useRecoveryStore.getState>['saveDailyCheckIn']>[0]) {
    useRecoveryStore.getState().saveDailyCheckIn(data);
  },

  // ─── Injuries ─────────────────────────────────────────────
  addInjury(data: {
    name: string;
    description?: string;
    bodyPart?: string;
    startDate: string;
    status: InjuryStatus;
  }) {
    useRecoveryStore.getState().addInjury(data);
  },

  updateInjuryStatus(id: string, status: InjuryStatus) {
    useRecoveryStore.getState().updateInjury(id, { status });
  },
};
