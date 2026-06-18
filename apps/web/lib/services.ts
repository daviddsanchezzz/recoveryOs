import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import type { InjuryStatus, WeightEntry } from '../stores/recovery-store';
import { getJson, postJson } from './api';
import { todayIso } from './date';

export const RecoveryService = {
  // ─── Weight ───────────────────────────────────────────────
  logWeight(kg: number, date = todayIso()) {
    useRecoveryStore.getState().saveWeight(kg, date);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson('/weights', { userId, date, weightKg: kg }).catch(() => {});
    }
  },

  // ─── Activity ─────────────────────────────────────────────
  logActivity(data: Omit<Parameters<ReturnType<typeof useRecoveryStore.getState>['addActivity']>[0], 'id'> & { date?: string }) {
    const resolvedDate = data.date ?? todayIso();
    useRecoveryStore.getState().addActivity({ ...data, date: resolvedDate });

    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson('/activities', {
        userId,
        type:           data.type,
        source:         data.stravaId ? 'strava' : 'manual',
        performedAt:    resolvedDate + 'T12:00:00.000Z',
        durationMin:    data.durationMinutes,
        calories:       data.kcal,
        avgHeartRate:   data.avgHeartRateBpm,
        maxHeartRate:   data.maxHeartRateBpm,
        notes:          data.notes,
        distanceKm:     data.distanceKm,
        elevationGainM: data.elevationGainM,
        avgPaceSecPerKm:data.avgPaceSecPerKm,
        avgCadenceSpm:  data.avgCadenceSpm,
        avgSpeedKmh:    data.avgSpeedKmh,
        avgPowerW:      data.avgPowerW,
        avgCadenceRpm:  data.avgCadenceRpm,
        kilojoules:     data.kilojoules,
        distanceM:      data.distanceM,
        avgPace100mSec: data.avgPacePer100mSec,
        muscleGroups:   data.muscleGroups,
        totalVolumeKg:  data.totalVolumeKg,
        stravaId:       data.stravaId ? String(data.stravaId) : undefined,
        stravaName:     data.stravaName,
      }).catch(() => {});
    }
  },

  // ─── Injury pain ──────────────────────────────────────────
  logPain(data: {
    injuryId: string;
    painLevel: number;
    didRehab: boolean;
    notes?: string;
    date?: string;
  }) {
    const resolvedDate = data.date ?? todayIso();
    useRecoveryStore.getState().logInjuryPain({
      injuryId: data.injuryId,
      painLevel: data.painLevel,
      didRehab: data.didRehab,
      notes: data.notes,
      date: resolvedDate,
    });
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson('/injury', {
        userId,
        date: resolvedDate,
        walkingPain: data.painLevel,
        stiffness: data.painLevel,
        swelling: false,
        rehabCompleted: data.didRehab,
        ...(data.notes ? { notes: data.notes } : {}),
      }).catch(() => {});
    }
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

  // ─── Server sync ─────────────────────────────────────────
  async loadUserData(userId: string): Promise<void> {
    try {
      const summary = await getJson<{
        currentWeightKg: number | null;
        trend: Array<{ date: string; value: number }>;
      }>(`/weights/${userId}/summary`);

      if (summary.trend.length > 0) {
        const entries: WeightEntry[] = summary.trend.map((t, i) => ({
          id: `server-w-${i}`,
          date: t.date.includes('T') ? t.date.split('T')[0] : t.date,
          weightKg: t.value,
        }));
        useRecoveryStore.getState().seedWeightFromServer(entries);
      }
    } catch {
      // API unavailable — keep local data
    }
  },
};
