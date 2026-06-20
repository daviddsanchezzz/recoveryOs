import type { ActivityEntry, ActivityType, DailyCheckIn, InjuryLog, SleepEntry, WeightEntry } from '../stores/recovery-store';
import { addDays, todayIso, weekDates } from './date';

// ── Public types ─────────────────────────────────────────────────────────────

export type ProgressTab    = 'actividad' | 'peso' | 'lesion' | 'sueno';
export type ActivityFilter = 'all' | 'gym' | 'bike' | 'walk' | 'run' | 'swim' | 'movilidad';
export type ChartMetric    = 'tiempo' | 'sesiones' | 'distancia' | 'peso' | 'dolor' | 'adherencia' | 'horas' | 'calidad';

export type ChartPoint = {
  label: string;
  rangeLabel: string;
  value: number | null;
  weekStart: string;
};

export type ChartMetricOption = {
  key: ChartMetric;
  label: string;
  chartType: 'bar' | 'line';
  formatValue: (v: number) => string;
};

export type StreakItem = {
  key: string;
  label: string;
  value: number;
  unit: 'días' | 'semanas' | 'noches';
  iconName: 'heart' | 'activity' | 'weight' | 'flame' | 'moon';
};

export type TrendItem = {
  key: string;
  text: string;
  direction: 'positive' | 'negative' | 'neutral';
};

export type CalendarDot = { hex: string; level: 1 | 2 | 3 };

// Discriminated union for weekly summary
export type ActivitySummary = {
  tab: 'actividad';
  totalMinutes: number;
  sessions: number;
  totalVolumeKg: number | null;
  distanceKm: number | null;
  avgHrBpm: number | null;
  prevTotalMinutes: number;
  prevSessions: number;
  prevVolumeKg: number | null;
};
export type WeightSummary = {
  tab: 'peso';
  currentKg: number | null;
  lastEntryDate: string | null;
  changeVsPrev: number | null;
  weekChangeKg: number | null;
  monthChangeKg: number | null;
};
export type LesionSummary = {
  tab: 'lesion';
  avg: number | null;
  prevAvg: number | null;
  trend: 'mejorando' | 'empeorando' | 'estable' | null;
  deltaPoints: number | null;
  daysCompleted: number;
  pct: number;
  prevDaysCompleted: number;
};
export type SleepSummary = {
  tab: 'sueno';
  avgH: number | null;
  totalH: number | null;
  avgQuality: number | null;
  prevAvgH: number | null;
  prevAvgQuality: number | null;
};
export type WeeklySummary = ActivitySummary | WeightSummary | LesionSummary | SleepSummary;

export type ProgressStoreData = {
  activities: ActivityEntry[];
  weightEntries: WeightEntry[];
  injuryLogs: InjuryLog[];
  checkIns: DailyCheckIn[];
  sleepEntries: SleepEntry[];
};

// ── Constants ────────────────────────────────────────────────────────────────

function fmtMinutes(v: number): string {
  if (v === 0) return '0 min';
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const CHART_METRIC_OPTIONS: Record<ProgressTab, ChartMetricOption[]> = {
  actividad: [
    { key: 'tiempo',    label: 'Tiempo',    chartType: 'bar',  formatValue: fmtMinutes         },
    { key: 'sesiones',  label: 'Sesiones',  chartType: 'bar',  formatValue: (v) => `${v} ses.` },
    { key: 'distancia', label: 'Distancia', chartType: 'bar',  formatValue: (v) => `${v} km`  },
  ],
  peso:   [{ key: 'peso',       label: 'Peso',       chartType: 'line', formatValue: (v) => `${v} kg` }],
  lesion: [
    { key: 'dolor',      label: 'Dolor',      chartType: 'line', formatValue: (v) => `${v}/10` },
    { key: 'adherencia', label: 'Rehab',      chartType: 'bar',  formatValue: (v) => `${v}%`  },
  ],
  sueno: [
    { key: 'horas',   label: 'Horas',   chartType: 'bar',  formatValue: (v) => `${v}h`  },
    { key: 'calidad', label: 'Calidad', chartType: 'line', formatValue: (v) => `${v}/5` },
  ],
};

export const DEFAULT_CHART_METRIC: Record<ProgressTab, ChartMetric> = {
  actividad: 'tiempo',
  peso:      'peso',
  lesion:    'dolor',
  sueno:     'horas',
};

export const TAB_CHART_COLOR: Record<ProgressTab, string> = {
  actividad: '#54715a',
  peso:      '#b56b45',
  lesion:    '#ef4444',
  sueno:     '#d9c4a1',
};

const TAB_HEX: Record<ProgressTab, string> = {
  actividad: '#54715a',
  peso:      '#b56b45',
  lesion:    '#ef4444',
  sueno:     '#a89068',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function matchesFilter(type: ActivityType, filter: ActivityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'movilidad') return type === 'mobility';
  return (type as string) === filter;
}

function fmtShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLast12WeekRanges(): { start: string; end: string; label: string; rangeLabel: string }[] {
  const today = todayIso();
  return Array.from({ length: 12 }, (_, i) => {
    const weeksAgo = 11 - i;
    const end      = addDays(today, -(weeksAgo * 7));
    const start    = addDays(end, -6);
    const dObj     = new Date(end + 'T12:00:00');
    return {
      start,
      end,
      label:      `${dObj.getDate()}/${dObj.getMonth() + 1}`,
      rangeLabel: `${fmtShort(start)} - ${fmtShort(end)}`,
    };
  });
}

function datesInRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) { out.push(cur); cur = addDays(cur, 1); }
  return out;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Number((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1));
}

function didRehabOn(date: string, data: ProgressStoreData): boolean {
  return data.checkIns.some((c) => c.date === date && c.habits.rehab) ||
         data.injuryLogs.some((l) => l.date === date && l.didRehab);
}

// ── Weekly summary ────────────────────────────────────────────────────────────

export function getWeeklySummary(
  tab: ProgressTab,
  filter: ActivityFilter,
  data: ProgressStoreData,
): WeeklySummary {
  const today   = todayIso();
  const wStart  = addDays(today, -6);
  const pwStart = addDays(today, -13);
  const pwEnd   = addDays(today, -7);

  switch (tab) {
    case 'actividad': {
      const acts     = data.activities.filter((a) => a.date >= wStart && matchesFilter(a.type, filter));
      const prevActs = data.activities.filter((a) => a.date >= pwStart && a.date <= pwEnd && matchesFilter(a.type, filter));

      const totalMinutes  = acts.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
      const sessions      = acts.length;
      const gymActs       = acts.filter((a) => a.type === 'gym');
      const distActs      = acts.filter((a) => a.distanceKm != null);
      const hrActs        = acts.filter((a) => a.avgHeartRateBpm != null);
      const totalVolumeKg = gymActs.length > 0 ? gymActs.reduce((s, a) => s + (a.totalVolumeKg ?? 0), 0) : null;
      const distanceKm    = distActs.length > 0 ? Number(distActs.reduce((s, a) => s + (a.distanceKm ?? 0), 0).toFixed(1)) : null;
      const avgHrBpm      = hrActs.length > 0 ? Math.round(hrActs.reduce((s, a) => s + (a.avgHeartRateBpm ?? 0), 0) / hrActs.length) : null;

      const prevTotalMinutes = prevActs.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
      const prevSessions     = prevActs.length;
      const prevGymActs      = prevActs.filter((a) => a.type === 'gym');
      const prevVolumeKg     = prevGymActs.length > 0 ? prevGymActs.reduce((s, a) => s + (a.totalVolumeKg ?? 0), 0) : null;

      // MOCK – comparación con semana anterior cuando no hay historial suficiente
      const effectivePrevMinutes  = prevTotalMinutes === 0 && totalMinutes   > 0 ? Math.round(totalMinutes  * 0.87)         : prevTotalMinutes;
      const effectivePrevSessions = prevSessions     === 0 && sessions       > 0 ? Math.max(1, sessions - 1)                 : prevSessions;
      const effectivePrevVolumeKg = prevVolumeKg  === null && totalVolumeKg != null ? Math.round(totalVolumeKg * 0.9)       : prevVolumeKg;
      return { tab: 'actividad', totalMinutes, sessions, totalVolumeKg, distanceKm, avgHrBpm,
               prevTotalMinutes: effectivePrevMinutes, prevSessions: effectivePrevSessions, prevVolumeKg: effectivePrevVolumeKg };
    }

    case 'peso': {
      const sorted       = [...data.weightEntries].sort((a, b) => a.date.localeCompare(b.date));
      const last         = sorted[sorted.length - 1];
      const prev         = sorted[sorted.length - 2];
      const changeVsPrev = last && prev ? Number((last.weightKg - prev.weightKg).toFixed(1)) : null;

      const weekAgoDate   = addDays(today, -7);
      const monthAgoDate  = addDays(today, -30);
      const entryWeekAgo  = [...sorted].reverse().find((e) => e.date <= weekAgoDate);
      const entryMonthAgo = [...sorted].reverse().find((e) => e.date <= monthAgoDate);

      const weekChangeKg  = last && entryWeekAgo  && entryWeekAgo.date  !== last.date ? Number((last.weightKg - entryWeekAgo.weightKg).toFixed(1))  : null;
      const monthChangeKg = last && entryMonthAgo && entryMonthAgo.date !== last.date ? Number((last.weightKg - entryMonthAgo.weightKg).toFixed(1)) : null;

      // MOCK – estimación de cambio cuando no hay entradas anteriores suficientes
      const effectiveWeekChange  = weekChangeKg  ?? (last != null ? -0.4 : null); // MOCK
      const effectiveMonthChange = monthChangeKg ?? (last != null ? -1.2 : null); // MOCK
      return { tab: 'peso', currentKg: last?.weightKg ?? null, lastEntryDate: last?.date ?? null, changeVsPrev, weekChangeKg: effectiveWeekChange, monthChangeKg: effectiveMonthChange };
    }

    case 'lesion': {
      const thisLogs  = data.injuryLogs.filter((l) => l.date >= wStart);
      const prevLogs  = data.injuryLogs.filter((l) => l.date >= pwStart && l.date <= pwEnd);
      const avgThis   = avg(thisLogs.map((l) => l.painLevel));
      const avgPrev   = avg(prevLogs.map((l) => l.painLevel));
      const deltaPoints = avgThis !== null && avgPrev !== null ? Number((avgThis - avgPrev).toFixed(1)) : null;
      let trend: LesionSummary['trend'] = null;
      if (avgThis !== null && avgPrev !== null) {
        if (avgThis < avgPrev - 0.3)      trend = 'mejorando';
        else if (avgThis > avgPrev + 0.3) trend = 'empeorando';
        else                              trend = 'estable';
      }
      const week              = weekDates();
      const daysCompleted     = week.filter((d) => didRehabOn(d, data)).length;
      const prevDaysCompleted = datesInRange(pwStart, pwEnd).filter((d) => didRehabOn(d, data)).length;
      // MOCK – estimación comparativa cuando no hay semana anterior
      const effectivePrevAvg  = avgPrev ?? (avgThis !== null ? Number(Math.min(10, avgThis + 1.3).toFixed(1)) : null); // MOCK
      const effectiveDelta    = avgThis !== null && effectivePrevAvg !== null ? Number((avgThis - effectivePrevAvg).toFixed(1)) : deltaPoints;
      let   effectiveTrend    = trend;
      if (!effectiveTrend && avgThis !== null && effectivePrevAvg !== null) {
        if (avgThis < effectivePrevAvg - 0.3)      effectiveTrend = 'mejorando';
        else if (avgThis > effectivePrevAvg + 0.3) effectiveTrend = 'empeorando';
        else                                        effectiveTrend = 'estable';
      }
      return { tab: 'lesion', avg: avgThis, prevAvg: effectivePrevAvg, trend: effectiveTrend, deltaPoints: effectiveDelta, daysCompleted, pct: Math.round((daysCompleted / 7) * 100), prevDaysCompleted };
    }

    case 'sueno': {
      const entries     = data.sleepEntries.filter((s) => s.date >= wStart);
      const prevEntries = data.sleepEntries.filter((s) => s.date >= pwStart && s.date <= pwEnd);
      const avgHVal    = avg(entries.map((e) => e.durationH));
      const avgQualVal = avg(entries.map((e) => e.quality));
      const prevAvgHVal  = avg(prevEntries.map((e) => e.durationH));
      const prevAvgQVal  = avg(prevEntries.map((e) => e.quality));
      // MOCK – estimación comparativa cuando no hay semana anterior
      const effectivePrevAvgH  = prevAvgHVal  ?? (avgHVal    !== null ? Number((avgHVal    - 0.2).toFixed(1)) : null); // MOCK
      const effectivePrevAvgQ  = prevAvgQVal  ?? (avgQualVal !== null ? Number((avgQualVal - 0.2).toFixed(1)) : null); // MOCK
      return {
        tab: 'sueno',
        avgH:           avgHVal,
        totalH:         entries.length > 0 ? Number(entries.reduce((s, e) => s + e.durationH, 0).toFixed(1)) : null,
        avgQuality:     avgQualVal,
        prevAvgH:       effectivePrevAvgH,
        prevAvgQuality: effectivePrevAvgQ,
      };
    }
  }
}

// ── 12-week chart data ────────────────────────────────────────────────────────

export function get12WeekChartData(
  tab: ProgressTab,
  filter: ActivityFilter,
  metric: ChartMetric,
  data: ProgressStoreData,
): ChartPoint[] {
  return getLast12WeekRanges().map(({ start, end, label, rangeLabel }) => {
    let value: number | null = null;
    switch (tab) {
      case 'actividad': {
        const acts = data.activities.filter((a) => a.date >= start && a.date <= end && matchesFilter(a.type, filter));
        if (metric === 'tiempo')    value = acts.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
        if (metric === 'sesiones')  value = acts.length;
        if (metric === 'distancia') { const km = acts.reduce((s, a) => s + (a.distanceKm ?? 0), 0); value = km > 0 ? Number(km.toFixed(1)) : null; }
        break;
      }
      case 'peso':   { const we = data.weightEntries.filter((w) => w.date >= start && w.date <= end); value = avg(we.map((w) => w.weightKg)); break; }
      case 'lesion': {
        const lo = data.injuryLogs.filter((l) => l.date >= start && l.date <= end);
        if (metric === 'dolor')      value = avg(lo.map((l) => l.painLevel));
        if (metric === 'adherencia') { const d = datesInRange(start, end).filter((d) => didRehabOn(d, data)).length; value = Math.round((d / 7) * 100); }
        break;
      }
      case 'sueno': {
        const se = data.sleepEntries.filter((s) => s.date >= start && s.date <= end);
        if (metric === 'horas')   value = avg(se.map((e) => e.durationH));
        if (metric === 'calidad') value = avg(se.map((e) => e.quality));
        break;
      }
    }
    return { label, rangeLabel, value, weekStart: start };
  });
}

// ── Last 12 individual weight entries ─────────────────────────────────────────

export function getLast12WeightChartData(data: ProgressStoreData): ChartPoint[] {
  const sorted = [...data.weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-12).map((entry) => {
    const d = new Date(entry.date + 'T12:00:00');
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, rangeLabel: `${d.getDate()}/${d.getMonth() + 1}`, value: entry.weightKg, weekStart: entry.date };
  });
}

// ── Calendar dots — heatmap intensity ────────────────────────────────────────

export function getCalendarDots(
  tab: ProgressTab,
  filter: ActivityFilter,
  year: number,
  month: number,
  data: ProgressStoreData,
): Record<string, CalendarDot> {
  const result: Record<string, CalendarDot> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const hex = TAB_HEX[tab];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let level: 1 | 2 | 3 | null = null;

    switch (tab) {
      case 'actividad': {
        const acts = data.activities.filter((a) => a.date === date && matchesFilter(a.type, filter));
        if (acts.length > 0) {
          const mins = acts.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
          level = mins >= 90 ? 3 : mins >= 30 ? 2 : 1;
        }
        break;
      }
      case 'peso':
        if (data.weightEntries.some((w) => w.date === date)) level = 2;
        break;
      case 'lesion': {
        const logs = data.injuryLogs.filter((l) => l.date === date);
        if (logs.length > 0) {
          const p = logs.reduce((s, l) => s + l.painLevel, 0) / logs.length;
          level = p >= 7 ? 3 : p >= 4 ? 2 : 1;
        } else if (didRehabOn(date, data)) {
          level = 1;
        }
        break;
      }
      case 'sueno': {
        const e = data.sleepEntries.find((s) => s.date === date);
        if (e) level = e.durationH >= 8 ? 3 : e.durationH >= 6.5 ? 2 : 1;
        break;
      }
    }

    if (level !== null) result[date] = { hex, level };
  }
  return result;
}

// ── Resumen calendar dots — heatmap basado en número de categorías registradas ─

export function getResumenCalendarDots(year: number, month: number, data: ProgressStoreData): Record<string, CalendarDot> {
  const result: Record<string, CalendarDot> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = [
      data.activities.some((a)   => a.date === date),
      data.weightEntries.some((w) => w.date === date),
      data.sleepEntries.some((s)  => s.date === date),
      data.injuryLogs.some((l)   => l.date === date),
    ].filter(Boolean).length;
    if (count > 0) result[date] = { hex: '#54715a', level: count >= 3 ? 3 : count >= 2 ? 2 : 1 };
  }
  return result;
}

// ── Streaks ───────────────────────────────────────────────────────────────────

export function getStreaks(data: ProgressStoreData): StreakItem[] {
  const today = todayIso();

  // Consecutive days with any data registered
  let anyDataDays = 0;
  let cur = today;
  while (
    data.weightEntries.some((e) => e.date === cur) ||
    data.sleepEntries.some((e)   => e.date === cur) ||
    data.activities.some((a)     => a.date === cur) ||
    data.injuryLogs.some((l)     => l.date === cur)
  ) { anyDataDays++; cur = addDays(cur, -1); }

  // Consecutive days with weight entry
  let weightDays = 0;
  cur = today;
  while (data.weightEntries.some((e) => e.date === cur)) { weightDays++; cur = addDays(cur, -1); }

  // Consecutive days with rehab
  let rehabDays = 0;
  cur = today;
  while (didRehabOn(cur, data)) { rehabDays++; cur = addDays(cur, -1); }

  // Consecutive nights sleeping ≥7h (today or yesterday as start)
  let sleepNights = 0;
  cur = data.sleepEntries.some((e) => e.date === today && e.durationH >= 7) ? today : addDays(today, -1);
  while (data.sleepEntries.some((e) => e.date === cur && e.durationH >= 7)) { sleepNights++; cur = addDays(cur, -1); }

  // Consecutive weeks with at least one activity
  let activityWeeks = 0;
  for (let w = 0; w < 52; w++) {
    const end = addDays(today, -(w * 7));
    if (!data.activities.some((a) => a.date >= addDays(end, -6) && a.date <= end)) break;
    activityWeeks++;
  }

  return [
    { key: 'any',       label: 'Días registrando',   value: anyDataDays,   unit: 'días',    iconName: 'flame'    },
    { key: 'peso',      label: 'Días con peso',       value: weightDays,    unit: 'días',    iconName: 'weight'   },
    { key: 'rehab',     label: 'Días de rehab',       value: rehabDays,     unit: 'días',    iconName: 'heart'    },
    { key: 'sueno7',    label: 'Noches seguidas +7h', value: sleepNights,   unit: 'noches',  iconName: 'moon'     },
    { key: 'actividad', label: 'Semanas activas',     value: activityWeeks, unit: 'semanas', iconName: 'activity' },
  ];
}

// ── Insights ──────────────────────────────────────────────────────────────────

export function getTrends(data: ProgressStoreData): TrendItem[] {
  const today    = todayIso();
  const insights: TrendItem[] = [];

  // 1. Best activity week in last 8 weeks
  const wStart       = addDays(today, -6);
  const thisWeekMins = data.activities.filter((a) => a.date >= wStart).reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
  if (thisWeekMins > 0) {
    let priorWithData = 0, priorWithMore = 0;
    for (let w = 1; w <= 8; w++) {
      const end   = addDays(today, -(w * 7));
      const start = addDays(end, -6);
      const mins  = data.activities.filter((a) => a.date >= start && a.date <= end).reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
      if (mins > 0) { priorWithData++; if (mins >= thisWeekMins) priorWithMore++; }
    }
    if (priorWithData >= 3 && priorWithMore === 0) {
      insights.push({ key: 'best-week', text: `Esta es tu mejor semana de actividad en ${priorWithData + 1} semanas.`, direction: 'positive' });
    }
  }

  // 2. Activity sessions comparison vs previous week
  const thisWeekSessions = data.activities.filter((a) => a.date >= wStart).length;
  const prevWeekSessions = data.activities.filter((a) => a.date >= addDays(today, -14) && a.date < addDays(today, -7)).length;
  if (thisWeekSessions > 0 && prevWeekSessions > 0) {
    const diff = thisWeekSessions - prevWeekSessions;
    if (diff >= 2)       insights.push({ key: 'sessions-up',   text: `Has completado ${diff} sesiones más que la semana pasada.`,        direction: 'positive' });
    else if (diff <= -2) insights.push({ key: 'sessions-down', text: `Has completado ${Math.abs(diff)} sesiones menos que la semana pasada.`, direction: 'negative' });
  }

  // 3. Pain trend — vs peak or vs previous week
  const recentPain = data.injuryLogs.filter((l) => l.date >= addDays(today, -7));
  if (recentPain.length > 0 && data.injuryLogs.length >= 4) {
    const rAvg  = recentPain.reduce((s, l) => s + l.painLevel, 0) / recentPain.length;
    const peak  = Math.max(...data.injuryLogs.map((l) => l.painLevel));
    if (peak > 0 && rAvg < peak * 0.65) {
      const pct = Math.round(((peak - rAvg) / peak) * 100);
      insights.push({ key: 'pain-peak', text: `Tu dolor está un ${pct}% por debajo de tu peor momento registrado.`, direction: 'positive' });
    } else {
      const prevPain = data.injuryLogs.filter((l) => l.date >= addDays(today, -14) && l.date < addDays(today, -7));
      if (prevPain.length > 0) {
        const pAvg = prevPain.reduce((s, l) => s + l.painLevel, 0) / prevPain.length;
        const d    = Number((rAvg - pAvg).toFixed(1));
        if (d <= -0.7) insights.push({ key: 'pain-down', text: `Tu dolor medio ha bajado ${Math.abs(d)} puntos esta semana.`,  direction: 'positive' });
        else if (d >= 0.7) insights.push({ key: 'pain-up', text: `Tu dolor medio ha subido ${d} puntos esta semana.`, direction: 'negative' });
      }
    }
  }

  // 4. Weight stability or trend
  const sortedW = [...data.weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  if (sortedW.length >= 5) {
    const recent  = sortedW.slice(-6);
    const weights = recent.map((e) => e.weightKg);
    const range   = Math.max(...weights) - Math.min(...weights);
    if (range <= 0.7) {
      insights.push({ key: 'weight-stable', text: `Peso estable (±${(range / 2).toFixed(1)} kg) durante las últimas ${recent.length} mediciones.`, direction: 'neutral' });
    } else {
      const first4 = sortedW.slice(-8, -4), last4 = sortedW.slice(-4);
      if (first4.length >= 2 && last4.length >= 2) {
        const aF = first4.reduce((s, e) => s + e.weightKg, 0) / first4.length;
        const aL = last4.reduce((s, e) => s + e.weightKg, 0) / last4.length;
        const d  = Number((aL - aF).toFixed(1));
        if (Math.abs(d) >= 0.5) insights.push({ key: 'weight-trend', text: `Has ${d > 0 ? 'ganado' : 'perdido'} ${Math.abs(d)} kg en las últimas ${sortedW.slice(-8).length} mediciones.`, direction: d > 0 ? 'negative' : 'positive' });
      }
    }
  }

  // 5. Sleep vs previous week
  const sleepThis = data.sleepEntries.filter((s) => s.date >= addDays(today, -7));
  const sleepPrev = data.sleepEntries.filter((s) => s.date >= addDays(today, -14) && s.date < addDays(today, -7));
  if (sleepThis.length >= 3 && sleepPrev.length >= 3) {
    const aT = sleepThis.reduce((s, e) => s + e.durationH, 0) / sleepThis.length;
    const aP = sleepPrev.reduce((s, e) => s + e.durationH, 0) / sleepPrev.length;
    const dm = Math.round((aT - aP) * 60);
    if (dm >= 20)  insights.push({ key: 'sleep-up',   text: `Has dormido ${dm} min más de media esta semana.`,        direction: 'positive' });
    if (dm <= -20) insights.push({ key: 'sleep-down', text: `Has dormido ${Math.abs(dm)} min menos de media esta semana.`, direction: 'negative' });
  }

  // 6. Rehab consistency
  let rehabWeeks = 0;
  for (let w = 0; w < 8; w++) {
    const end = addDays(today, -(w * 7));
    if (datesInRange(addDays(end, -6), end).filter((d) => didRehabOn(d, data)).length < 4) break;
    rehabWeeks++;
  }
  if (rehabWeeks >= 3) insights.push({ key: 'rehab', text: `Llevas ${rehabWeeks} semanas cumpliendo tu objetivo de rehab.`, direction: 'positive' });

  const sorted = [
    ...insights.filter((i) => i.direction === 'positive'),
    ...insights.filter((i) => i.direction === 'neutral'),
    ...insights.filter((i) => i.direction === 'negative'),
  ].slice(0, 3);

  if (sorted.length > 0) return sorted;

  // MOCK – mostrar cuando hay datos pero aún no hay historial suficiente para comparar
  const hasAnyData = data.activities.length > 0 || data.weightEntries.length > 0 ||
    data.sleepEntries.length > 0 || data.injuryLogs.length > 0;
  if (!hasAnyData) {
    return [{ key: 'empty', text: 'Registra datos regularmente para ver tus insights.', direction: 'neutral' }];
  }
  const seed = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const mockPool: TrendItem[] = [
    { key: 'mock-1', text: 'Has dormido una media de 7h 45min esta semana.',           direction: 'positive' },
    { key: 'mock-2', text: 'Has completado tus sesiones de entrenamiento esta semana.', direction: 'positive' },
    { key: 'mock-3', text: 'Peso estable (±0.3 kg) durante los últimos días.',          direction: 'neutral'  },
    { key: 'mock-4', text: 'Tu dolor medio ha bajado 0.8 puntos esta semana.',          direction: 'positive' },
    { key: 'mock-5', text: 'Llevas 3 días consecutivos registrando todos tus datos.',   direction: 'positive' },
  ]; // MOCK
  return [mockPool[seed % mockPool.length], mockPool[(seed + 1) % mockPool.length]];
}
