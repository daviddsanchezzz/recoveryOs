import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import type { ActivityEntry, InjuryStatus, WeightEntry } from '../stores/recovery-store';
import { getJson, postJson } from './api';
import { todayIso } from './date';

type ServerActivity = {
  id: string;
  type: string;
  performedAt: string;
  durationMin?: number | null;
  calories?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  notes?: string | null;
  distanceKm?: number | null;
  elevationGainM?: number | null;
  avgPaceSecPerKm?: number | null;
  avgCadenceSpm?: number | null;
  avgSpeedKmh?: number | null;
  avgPowerW?: number | null;
  avgCadenceRpm?: number | null;
  kilojoules?: number | null;
  distanceM?: number | null;
  avgPace100mSec?: number | null;
  muscleGroups?: string[];
  totalVolumeKg?: number | null;
  stravaId?: string | null;
  stravaName?: string | null;
};

function mapServerActivity(a: ServerActivity): ActivityEntry {
  return {
    id:               a.id,
    type:             a.type as ActivityEntry['type'],
    date:             a.performedAt.includes('T') ? a.performedAt.split('T')[0] : a.performedAt,
    durationMinutes:  a.durationMin ?? undefined,
    kcal:             a.calories ?? undefined,
    avgHeartRateBpm:  a.avgHeartRate ?? undefined,
    maxHeartRateBpm:  a.maxHeartRate ?? undefined,
    notes:            a.notes ?? undefined,
    distanceKm:       a.distanceKm ?? undefined,
    elevationGainM:   a.elevationGainM ?? undefined,
    avgPaceSecPerKm:  a.avgPaceSecPerKm ?? undefined,
    avgCadenceSpm:    a.avgCadenceSpm ?? undefined,
    avgSpeedKmh:      a.avgSpeedKmh ?? undefined,
    avgPowerW:        a.avgPowerW ?? undefined,
    avgCadenceRpm:    a.avgCadenceRpm ?? undefined,
    kilojoules:       a.kilojoules ?? undefined,
    distanceM:        a.distanceM ?? undefined,
    avgPacePer100mSec:a.avgPace100mSec ?? undefined,
    muscleGroups:     (a.muscleGroups ?? []) as ActivityEntry['muscleGroups'],
    totalVolumeKg:    a.totalVolumeKg ?? undefined,
    stravaId:         a.stravaId ? Number(a.stravaId) : undefined,
    stravaName:       a.stravaName ?? undefined,
  };
}

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

  // Called at startup: loads only what Today screen needs
  async loadTodayData(userId: string, date: string): Promise<void> {
    const store = useRecoveryStore.getState();

    const [weightsResult, todayResult] = await Promise.allSettled([
      getJson<{ currentWeightKg: number | null; trend: Array<{ date: string; value: number }> }>(
        `/weights/${userId}/summary`,
      ),
      getJson<ServerActivity[]>(`/activities/${userId}/today?date=${date}`),
    ]);

    if (weightsResult.status === 'fulfilled') {
      const { trend } = weightsResult.value;
      if (trend.length > 0) {
        const entries: WeightEntry[] = trend.map((t, i) => ({
          id: `server-w-${i}`,
          date: t.date.includes('T') ? t.date.split('T')[0] : t.date,
          weightKg: t.value,
        }));
        store.seedWeightFromServer(entries);
      }
    }

    if (todayResult.status === 'fulfilled') {
      store.seedTodayActivities(todayResult.value.map(mapServerActivity));
    }
  },

  // Called lazily when Actividades tab opens, and on each scroll-to-bottom
  async loadActivitiesPage(userId: string, beforeId?: string): Promise<void> {
    const store = useRecoveryStore.getState();
    const url = beforeId
      ? `/activities/${userId}?limit=50&beforeId=${beforeId}`
      : `/activities/${userId}?limit=50`;

    try {
      const res = await getJson<{ items: ServerActivity[]; hasMore: boolean; nextCursor: string | null }>(url);
      store.appendActivities(res.items.map(mapServerActivity), res.hasMore, res.nextCursor);
    } catch {
      // keep existing data on error
    }
  },

  clearData(): void {
    useRecoveryStore.getState().clearAllData();
  },
};
