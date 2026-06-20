import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import type { ActivityEntry, Injury, InjuryLog, InjuryStatus, SleepEntry, WeightEntry } from '../stores/recovery-store';
import { deleteJson, getJson, patchJson, postJson } from './api';
import { sameDay, todayIso } from './date';

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

type ServerInjury = {
  id: string;
  userId: string;
  name: string;
  bodyPart?: string | null;
  description?: string | null;
  startDate: string;
  status: string;
  logs?: ServerInjuryLog[];
};

type ServerInjuryLog = {
  id: string;
  injuryId: string;
  userId: string;
  date: string;
  painLevel: number;
  didRehab: boolean;
  notes?: string | null;
};

type ServerSleepEntry = {
  id: string;
  userId: string;
  date: string;
  durationH: number;
  quality: number;
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

function isoDate(s: string): string {
  return s.includes('T') ? s.split('T')[0] : s;
}

function mapServerInjury(i: ServerInjury): Injury {
  return {
    id: i.id,
    name: i.name,
    bodyPart: i.bodyPart ?? undefined,
    description: i.description ?? undefined,
    startDate: isoDate(i.startDate),
    status: i.status as InjuryStatus,
  };
}

function mapServerInjuryLog(l: ServerInjuryLog): InjuryLog {
  return {
    id: l.id,
    injuryId: l.injuryId,
    date: isoDate(l.date),
    painLevel: l.painLevel,
    didRehab: l.didRehab,
    notes: l.notes ?? undefined,
  };
}

function mapServerSleep(s: ServerSleepEntry): SleepEntry {
  return {
    id: s.id,
    date: isoDate(s.date),
    durationH: s.durationH,
    quality: s.quality as SleepEntry['quality'],
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

  deleteWeight(id: string) {
    useRecoveryStore.getState().removeWeightEntry(id);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      deleteJson(`/weights/${id}`).catch(() => {});
    }
  },

  // ─── Activity ─────────────────────────────────────────────
  logActivity(data: Omit<ActivityEntry, 'id' | 'date'> & { date?: string }) {
    const resolvedDate = data.date ?? todayIso();
    const id = crypto.randomUUID();
    useRecoveryStore.getState().addActivity({ ...data, id, date: resolvedDate });

    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson('/activities', {
        id,
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

  deleteActivity(id: string): void {
    useRecoveryStore.getState().removeActivity(id);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      fetch(`/api/activities/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
    }
  },

  // ─── Injuries ─────────────────────────────────────────────
  createInjury(data: { name: string; bodyPart?: string; description?: string; startDate: string; status?: InjuryStatus }) {
    const status = data.status ?? 'active';
    useRecoveryStore.getState().addInjury({ ...data, status });
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson<ServerInjury>('/injuries', { userId, ...data, startDate: data.startDate, status }).catch(() => {});
    }
  },

  updateInjuryStatus(id: string, status: InjuryStatus) {
    useRecoveryStore.getState().updateInjury(id, { status });
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      patchJson(`/injuries/${id}`, { status }).catch(() => {});
    }
  },

  deleteInjury(id: string) {
    useRecoveryStore.getState().removeInjury(id);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      deleteJson(`/injuries/${id}`).catch(() => {});
    }
  },

  // ─── Injury logs (dolor/rehab) ────────────────────────────
  logPain(data: { injuryId: string; painLevel: number; didRehab: boolean; notes?: string; date?: string }) {
    const resolvedDate = data.date ?? todayIso();
    const id = crypto.randomUUID();
    useRecoveryStore.getState().logInjuryPain({
      id,
      injuryId: data.injuryId,
      painLevel: data.painLevel,
      didRehab: data.didRehab,
      notes: data.notes,
      date: resolvedDate,
    } as InjuryLog);

    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson(`/injuries/${data.injuryId}/logs`, {
        userId,
        date: resolvedDate,
        painLevel: data.painLevel,
        didRehab: data.didRehab,
        notes: data.notes,
      }).catch(() => {});
    }
  },

  deleteInjuryLog(id: string) {
    useRecoveryStore.getState().removeInjuryLog(id);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      deleteJson(`/injuries/logs/${id}`).catch(() => {});
    }
  },

  // ─── Sleep ────────────────────────────────────────────────
  logSleep(data: { durationH: number; quality: 1 | 2 | 3 | 4 | 5; date?: string }) {
    const resolvedDate = data.date ?? todayIso();
    const id = crypto.randomUUID();
    const userId = useSessionStore.getState().user?.id;

    // If replacing an existing entry for this date, delete it from the server first
    const existing = useRecoveryStore.getState().sleepEntries.find((e) => sameDay(e.date, resolvedDate));
    if (existing && userId) {
      deleteJson(`/sleep/${existing.id}`).catch(() => {});
    }

    useRecoveryStore.getState().saveSleep({ ...data, id, date: resolvedDate });
    if (userId) {
      postJson('/sleep', { id, userId, date: resolvedDate, durationH: data.durationH, quality: data.quality }).catch(() => {});
    }
  },

  updateSleep(id: string, data: { durationH?: number; quality?: 1 | 2 | 3 | 4 | 5; date?: string }) {
    useRecoveryStore.getState().updateSleepEntry(id, data);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      patchJson(`/sleep/${id}`, data).catch(() => {});
    }
  },

  deleteSleep(id: string) {
    useRecoveryStore.getState().removeSleepEntry(id);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      deleteJson(`/sleep/${id}`).catch(() => {});
    }
  },

  // ─── Full daily check-in ──────────────────────────────────
  saveCheckIn(data: Parameters<ReturnType<typeof useRecoveryStore.getState>['saveDailyCheckIn']>[0]) {
    useRecoveryStore.getState().saveDailyCheckIn(data);
  },

  // ─── Server sync ─────────────────────────────────────────

  async loadTodayData(userId: string, date: string): Promise<void> {
    const store = useRecoveryStore.getState();

    const [weightsResult, todayResult, injuriesResult, sleepResult] = await Promise.allSettled([
      getJson<{ currentWeightKg: number | null; trend: Array<{ id: string; date: string; value: number }> }>(
        `/weights/${userId}/summary`,
      ),
      getJson<ServerActivity[]>(`/activities/${userId}/today?date=${date}`),
      getJson<ServerInjury[]>(`/injuries/${userId}`),
      getJson<ServerSleepEntry[]>(`/sleep/${userId}`),
    ]);

    if (weightsResult.status === 'fulfilled') {
      const { trend } = weightsResult.value;
      if (trend.length > 0) {
        const entries: WeightEntry[] = trend.map((t) => ({
          id: t.id,
          date: t.date.includes('T') ? t.date.split('T')[0] : t.date,
          weightKg: t.value,
        }));
        store.seedWeightFromServer(entries);
      }
    }

    if (todayResult.status === 'fulfilled') {
      store.seedTodayActivities(todayResult.value.map(mapServerActivity));
    }

    if (injuriesResult.status === 'fulfilled') {
      const injuries = injuriesResult.value.map(mapServerInjury);
      const logs = injuriesResult.value.flatMap((i) => (i.logs ?? []).map(mapServerInjuryLog));
      store.seedInjuriesFromServer(injuries, logs);
    }

    if (sleepResult.status === 'fulfilled') {
      store.seedSleepFromServer(sleepResult.value.map(mapServerSleep));
    }
  },

  async loadActivitiesPage(userId: string, beforeId?: string): Promise<void> {
    const store = useRecoveryStore.getState();
    const url = beforeId
      ? `/activities/${userId}?limit=50&beforeId=${beforeId}`
      : `/activities/${userId}?limit=50`;

    try {
      const res = await getJson<{ items: ServerActivity[]; hasMore: boolean; nextCursor: string | null }>(url);
      store.appendActivities(res.items.map(mapServerActivity), res.hasMore, res.nextCursor, !beforeId);
    } catch {
      // keep existing data on error
    }
  },

  clearData(): void {
    useRecoveryStore.getState().clearAllData();
  },
};
