import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import { toast } from '../stores/toast-store';
import type { ActivityEntry, DailyHealthMetricEntry, Injury, InjuryLog, InjuryStatus, SleepEntry, WeightEntry } from '../stores/recovery-store';
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
  isRace?: boolean | null;
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

type ServerHealthMetric = {
  id: string;
  userId: string;
  date: string;
  steps: number;
  activeCalories: number;
  source: string;
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
    isRace:           a.isRace ?? false,
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

function mapServerHealthMetric(entry: ServerHealthMetric): DailyHealthMetricEntry {
  return {
    id: entry.id,
    date: isoDate(entry.date),
    steps: entry.steps,
    activeCalories: entry.activeCalories,
    source: entry.source as DailyHealthMetricEntry['source'],
  };
}

export const RecoveryService = {
  // ─── Weight ───────────────────────────────────────────────
  logWeight(kg: number, date = todayIso()) {
    const id = crypto.randomUUID();
    useRecoveryStore.getState().saveWeight(kg, date, id);
    toast.success('Peso guardado');
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson('/weights', { id, userId, date, weightKg: kg })
        .catch(() => toast.error('No se pudo guardar el peso. Inténtalo de nuevo.'));
    }
  },

  deleteWeight(id: string, silent = false) {
    useRecoveryStore.getState().removeWeightEntry(id);
    if (!silent) toast.success('Peso eliminado');
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      deleteJson(`/weights/${id}`)
        .catch(() => toast.error('No se pudo eliminar el peso.'));
    }
  },

  // ─── Activity ─────────────────────────────────────────────
  logActivity(data: Omit<ActivityEntry, 'id' | 'date'> & { id?: string; date?: string }) {
    const resolvedDate = data.date ?? todayIso();
    const id = data.id ?? crypto.randomUUID();
    useRecoveryStore.getState().addActivity({ ...data, id, date: resolvedDate });
    toast.success('Actividad guardada');

    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson('/activities', {
        id,
        userId,
        type:            data.type,
        source:          data.stravaId ? 'strava' : 'manual',
        performedAt:     resolvedDate + 'T12:00:00.000Z',
        durationMin:     data.durationMinutes,
        calories:        data.kcal,
        avgHeartRate:    data.avgHeartRateBpm,
        maxHeartRate:    data.maxHeartRateBpm,
        notes:           data.notes,
        distanceKm:      data.distanceKm,
        elevationGainM:  data.elevationGainM,
        avgPaceSecPerKm: data.avgPaceSecPerKm,
        avgCadenceSpm:   data.avgCadenceSpm,
        avgSpeedKmh:     data.avgSpeedKmh,
        avgPowerW:       data.avgPowerW,
        avgCadenceRpm:   data.avgCadenceRpm,
        kilojoules:      data.kilojoules,
        distanceM:       data.distanceM,
        avgPace100mSec:  data.avgPacePer100mSec,
        muscleGroups:    data.muscleGroups,
        totalVolumeKg:   data.totalVolumeKg,
        stravaId:        data.stravaId ? String(data.stravaId) : undefined,
        stravaName:      data.stravaName,
        isRace:          data.isRace ?? false,
      }).catch(() => toast.error('No se pudo guardar la actividad. Inténtalo de nuevo.'));
    }
  },

  async setIsRace(id: string, isRace: boolean): Promise<void> {
    useRecoveryStore.getState().updateActivityIsRace(id, isRace);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      await patchJson(`/activities/${id}/is-race`, { isRace });
    }
  },

  deleteActivity(id: string, silent = false): void {
    useRecoveryStore.getState().removeActivity(id);
    if (!silent) toast.success('Actividad eliminada');
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      fetch(`/api/activities/${id}`, { method: 'DELETE', credentials: 'include' })
        .then((r) => { if (!r.ok) toast.error('No se pudo eliminar la actividad.'); })
        .catch(() => toast.error('No se pudo eliminar la actividad.'));
    }
  },

  // ─── Injuries ─────────────────────────────────────────────
  createInjury(data: { name: string; bodyPart?: string; description?: string; startDate: string; status?: InjuryStatus }) {
    const id = crypto.randomUUID();
    const status = data.status ?? 'active';
    useRecoveryStore.getState().addInjury({ ...data, status, id });
    toast.success('Lesión registrada');
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson<ServerInjury>('/injuries', { id, userId, ...data, startDate: data.startDate, status })
        .catch(() => toast.error('No se pudo guardar la lesión.'));
    }
  },

  updateInjuryStatus(id: string, status: InjuryStatus) {
    useRecoveryStore.getState().updateInjury(id, { status });
    toast.success('Estado actualizado');
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      patchJson(`/injuries/${id}`, { status })
        .catch(() => toast.error('No se pudo actualizar el estado de la lesión.'));
    }
  },

  deleteInjury(id: string) {
    useRecoveryStore.getState().removeInjury(id);
    toast.success('Lesión eliminada');
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      deleteJson(`/injuries/${id}`)
        .catch(() => toast.error('No se pudo eliminar la lesión.'));
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
    });
    toast.success('Dolor registrado');

    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      postJson(`/injuries/${data.injuryId}/logs`, {
        id,
        userId,
        date: resolvedDate,
        painLevel: data.painLevel,
        didRehab: data.didRehab,
        notes: data.notes,
      }).catch(() => toast.error('No se pudo guardar el registro de dolor.'));
    }
  },

  deleteInjuryLog(id: string) {
    useRecoveryStore.getState().removeInjuryLog(id);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      deleteJson(`/injuries/logs/${id}`)
        .catch(() => toast.error('No se pudo eliminar el registro.'));
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
    toast.success('Sueño registrado');
    if (userId) {
      postJson('/sleep', { id, userId, date: resolvedDate, durationH: data.durationH, quality: data.quality })
        .catch(() => toast.error('No se pudo guardar el sueño. Inténtalo de nuevo.'));
    }
  },

  updateSleep(id: string, data: { durationH?: number; quality?: 1 | 2 | 3 | 4 | 5; date?: string }) {
    useRecoveryStore.getState().updateSleepEntry(id, data);
    toast.success('Sueño actualizado');
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      patchJson(`/sleep/${id}`, data)
        .catch(() => toast.error('No se pudo actualizar el sueño.'));
    }
  },

  deleteSleep(id: string) {
    useRecoveryStore.getState().removeSleepEntry(id);
    toast.success('Registro eliminado');
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      deleteJson(`/sleep/${id}`)
        .catch(() => toast.error('No se pudo eliminar el registro de sueño.'));
    }
  },

  // ─── Full daily check-in ──────────────────────────────────
  logHealthMetric(data: { date?: string; steps: number; activeCalories: number; source?: DailyHealthMetricEntry['source'] }) {
    const userId = useSessionStore.getState().user?.id;
    if (!userId) return;

    postJson<ServerHealthMetric>('/health-metrics', {
      date: data.date ?? todayIso(),
      steps: data.steps,
      activeCalories: data.activeCalories,
      source: data.source ?? 'manual',
    })
      .then((entry) => {
        useRecoveryStore.getState().saveHealthMetric(mapServerHealthMetric(entry));
        toast.success('Movimiento guardado');
      })
      .catch(() => toast.error('No se pudo guardar el movimiento.'));
  },

  updateHealthMetric(id: string, data: { date?: string; steps?: number; activeCalories?: number; source?: DailyHealthMetricEntry['source'] }) {
    patchJson<ServerHealthMetric>(`/health-metrics/${id}`, data)
      .then((entry) => {
        useRecoveryStore.getState().updateHealthMetric(id, mapServerHealthMetric(entry));
        toast.success('Movimiento actualizado');
      })
      .catch(() => toast.error('No se pudo actualizar el movimiento.'));
  },

  deleteHealthMetric(id: string, silent = false) {
    useRecoveryStore.getState().removeHealthMetric(id);
    if (!silent) toast.success('Movimiento eliminado');
    deleteJson(`/health-metrics/${id}`)
      .catch(() => toast.error('No se pudo eliminar el movimiento.'));
  },

  saveCheckIn(data: Parameters<ReturnType<typeof useRecoveryStore.getState>['saveDailyCheckIn']>[0]) {
    useRecoveryStore.getState().saveDailyCheckIn(data);
  },

  // ─── Server sync ─────────────────────────────────────────

  async loadTodayData(userId: string, date: string): Promise<void> {
    const store = useRecoveryStore.getState();
    const healthFrom = '2010-01-01';

    const [weightsResult, todayResult, injuriesResult, sleepResult, healthMetricsResult] = await Promise.allSettled([
      getJson<{ currentWeightKg: number | null; trend: Array<{ id: string; date: string; value: number }> }>(
        `/weights/${userId}/summary`,
      ),
      getJson<ServerActivity[]>(`/activities/${userId}/today?date=${date}`),
      getJson<ServerInjury[]>(`/injuries/${userId}`),
      getJson<ServerSleepEntry[]>(`/sleep/${userId}`),
      getJson<ServerHealthMetric[]>(`/health-metrics?from=${healthFrom}&to=${date}`),
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
    } else {
      toast.error('No se pudieron cargar los datos de peso.');
    }

    if (todayResult.status === 'fulfilled') {
      store.seedTodayActivities(todayResult.value.map(mapServerActivity));
    } else {
      toast.error('No se pudieron cargar las actividades de hoy.');
    }

    if (injuriesResult.status === 'fulfilled') {
      const injuries = injuriesResult.value.map(mapServerInjury);
      const logs = injuriesResult.value.flatMap((i) => (i.logs ?? []).map(mapServerInjuryLog));
      store.seedInjuriesFromServer(injuries, logs);
    } else {
      toast.error('No se pudieron cargar los datos de lesiones.');
    }

    if (sleepResult.status === 'fulfilled') {
      store.seedSleepFromServer(sleepResult.value.map(mapServerSleep));
    } else {
      toast.error('No se pudieron cargar los registros de sueño.');
    }

    if (healthMetricsResult.status === 'fulfilled') {
      store.seedHealthMetricsFromServer(healthMetricsResult.value.map(mapServerHealthMetric));
    } else {
      toast.error('No se pudieron cargar los datos de movimiento.');
    }
  },

  async fetchActivitiesFrom(userId: string, since: Date): Promise<ActivityEntry[]> {
    const iso = since.toISOString().split('T')[0];
    const res = await getJson<{ items: ServerActivity[] }>(`/activities/${userId}?since=${iso}`);
    return res.items.map(mapServerActivity);
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
      toast.error('No se pudieron cargar las actividades.');
    }
  },

  clearData(): void {
    useRecoveryStore.getState().clearAllData();
  },
};

// ─── Nutrition ─────────────────────────────────────────────────────────────────

import { useNutritionStore } from '../stores/nutrition-store';
import type {
  MealEntry, NutritionTemplate, DailySummary, ParsedMealProposal,
  WeeklyNutrition, NutritionGoal, MealType, Quality, Confidence, MealSource,
} from '../stores/nutrition-store';

type ServerMealEntry = {
  id: string;
  userId: string;
  consumedAt: string;
  rawText: string;
  description: string | null;
  mealType: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  quality: string;
  confidence: string;
  source: string;
};

function mapServerMeal(m: ServerMealEntry): MealEntry {
  const date = m.consumedAt.includes('T') ? m.consumedAt.split('T')[0] : m.consumedAt;
  return {
    id: m.id,
    userId: m.userId,
    date,
    mealType: m.mealType as MealType,
    description: m.description,
    rawText: m.rawText,
    calories: m.calories,
    proteinGrams: m.proteinGrams,
    carbsGrams: m.carbsGrams,
    fatGrams: m.fatGrams,
    quality: m.quality as Quality,
    confidence: m.confidence as Confidence,
    source: m.source as MealSource,
  };
}

export const NutritionService = {
  async parseMeal(text: string, date?: string): Promise<ParsedMealProposal> {
    return postJson<ParsedMealProposal>('/nutrition/parse', { text, date });
  },

  async saveMeal(params: {
    userId: string;
    date: string;
    mealType: MealType;
    rawText: string;
    description?: string;
    caloriesEstimate: number;
    proteinEstimate: number;
    carbsEstimate?: number;
    fatEstimate?: number;
    quality?: Quality;
    confidence?: Confidence;
    source?: MealSource;
  }): Promise<MealEntry> {
    const saved = await postJson<ServerMealEntry>('/nutrition/meals', params);
    const meal  = mapServerMeal(saved);
    useNutritionStore.getState().addMeal(meal);
    toast.success('Comida guardada');
    return meal;
  },

  async fetchDailySummary(userId: string, date: string): Promise<DailySummary> {
    const raw = await getJson<{
      totalCalories: number;
      totalProtein: number;
      totalCarbs: number;
      totalFat: number;
      caloriesTarget: number;
      proteinTarget: number;
      mealsCount: number;
      mealsByType?: Record<string, ServerMealEntry[]>;
      missingMealTypes: string[];
      proteinProgressPercent: number;
      caloriesProgressPercent: number;
    }>(
      `/nutrition/summary?userId=${userId}&date=${date}`,
    );
    const summary: DailySummary = {
      totalCalories: raw.totalCalories,
      totalProtein: raw.totalProtein,
      totalCarbs: raw.totalCarbs,
      totalFat: raw.totalFat,
      caloriesTarget: raw.caloriesTarget,
      proteinTarget: raw.proteinTarget,
      mealsCount: raw.mealsCount,
      mealsByType: Object.fromEntries(
        Object.entries(raw.mealsByType ?? {}).map(([k, v]) => [
          k,
          v.map(mapServerMeal),
        ]),
      ),
      missingMealTypes: raw.missingMealTypes as MealType[],
      proteinProgressPercent: raw.proteinProgressPercent,
      caloriesProgressPercent: raw.caloriesProgressPercent,
    };
    useNutritionStore.getState().setSummaryForDate(date, summary);
    return summary;
  },

  async deleteMeal(mealId: string, date: string): Promise<void> {
    await deleteJson(`/nutrition/meals/${mealId}`);
    useNutritionStore.getState().removeMeal(mealId, date);
    toast.success('Comida eliminada');
  },

  async fetchTemplates(): Promise<NutritionTemplate[]> {
    const templates = await getJson<NutritionTemplate[]>('/nutrition/templates');
    useNutritionStore.getState().setTemplates(templates);
    return templates;
  },

  async fetchWeeklyNutrition(userId: string): Promise<WeeklyNutrition> {
    const data = await getJson<WeeklyNutrition>(`/nutrition/weekly?userId=${userId}`);
    useNutritionStore.getState().setWeeklyNutrition(data);
    return data;
  },

  async fetchMealsForDate(date: string): Promise<MealEntry[]> {
    const raw = await getJson<ServerMealEntry[]>(`/nutrition/meals?date=${date}`);
    const meals = raw.map(mapServerMeal);
    useNutritionStore.getState().setMealsForDate(date, meals);
    return meals;
  },

  async updateMeal(
    id: string,
    date: string,
    fields: {
      mealType?: MealType;
      description?: string;
      caloriesEstimate?: number;
      proteinEstimate?: number;
      carbsEstimate?: number;
      fatEstimate?: number;
      quality?: Quality;
    },
  ): Promise<MealEntry> {
    const raw = await patchJson<ServerMealEntry>(`/nutrition/meals/${id}`, fields);
    const meal = mapServerMeal(raw);
    useNutritionStore.getState().updateMeal(id, date, meal);
    return meal;
  },

  async fetchGoal(): Promise<NutritionGoal> {
    const raw = await getJson<{ caloriesTarget: number; proteinTarget: number; waterTargetMl: number | null }>(
      '/nutrition/goals',
    );
    const goal: NutritionGoal = {
      caloriesTarget: raw.caloriesTarget,
      proteinTarget:  raw.proteinTarget,
      waterTargetMl:  raw.waterTargetMl,
    };
    useNutritionStore.getState().setGoal(goal);
    return goal;
  },

  async updateGoal(fields: {
    caloriesTarget?: number;
    proteinTarget?: number;
    waterTargetMl?: number;
  }): Promise<NutritionGoal> {
    const raw = await patchJson<{ caloriesTarget: number; proteinTarget: number; waterTargetMl: number | null }>(
      '/nutrition/goals',
      fields,
    );
    const goal: NutritionGoal = {
      caloriesTarget: raw.caloriesTarget,
      proteinTarget:  raw.proteinTarget,
      waterTargetMl:  raw.waterTargetMl,
    };
    useNutritionStore.getState().setGoal(goal);
    return goal;
  },
};
