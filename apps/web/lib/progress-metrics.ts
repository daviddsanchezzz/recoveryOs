import type { ActivityEntry, ActivityType, DailyCheckIn, InjuryLog, SleepEntry, WeightEntry } from '../stores/recovery-store';
import { addDays, todayIso, weekDates } from './date';

// ── Public types ────────────────────────────────────────────────────────────

export type ProgressTab     = 'actividad' | 'peso' | 'dolor' | 'rehab' | 'sueno';
export type ActivityFilter  = 'all' | 'gym' | 'bike' | 'walk' | 'run' | 'swim' | 'rehab' | 'movilidad';
export type ChartMetric     = 'tiempo' | 'sesiones' | 'distancia' | 'peso' | 'dolor' | 'adherencia' | 'horas' | 'calidad';

export type ChartPoint = { label: string; value: number | null; weekStart: string };

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
  unit: 'días' | 'semanas';
  iconName: 'heart' | 'activity' | 'weight' | 'flame';
};

export type TrendItem = { key: string; text: string };

// Discriminated union for weekly summary
export type ActivitySummary = {
  tab: 'actividad';
  totalMinutes: number;
  sessions: number;
  totalVolumeKg: number | null;
  distanceKm: number | null;
  avgHrBpm: number | null;
};
export type WeightSummary = { tab: 'peso'; currentKg: number | null; weeklyChange: number | null; weeklyAvg: number | null };
export type PainSummary   = { tab: 'dolor'; avg: number | null; prevAvg: number | null; trend: 'mejorando' | 'empeorando' | 'estable' | null };
export type RehabSummary  = { tab: 'rehab'; daysCompleted: number; pct: number };
export type SleepSummary  = { tab: 'sueno'; avgH: number | null; totalH: number | null; avgQuality: number | null };
export type WeeklySummary = ActivitySummary | WeightSummary | PainSummary | RehabSummary | SleepSummary;

export type ProgressStoreData = {
  activities: ActivityEntry[];
  weightEntries: WeightEntry[];
  injuryLogs: InjuryLog[];
  checkIns: DailyCheckIn[];
  sleepEntries: SleepEntry[];
};

// ── Constants ───────────────────────────────────────────────────────────────

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
  peso:  [{ key: 'peso',       label: 'Peso',       chartType: 'line', formatValue: (v) => `${v} kg` }],
  dolor: [{ key: 'dolor',      label: 'Dolor',      chartType: 'line', formatValue: (v) => `${v}/10` }],
  rehab: [{ key: 'adherencia', label: 'Adherencia', chartType: 'bar',  formatValue: (v) => `${v}%`  }],
  sueno: [
    { key: 'horas',   label: 'Horas',   chartType: 'bar',  formatValue: (v) => `${v}h`  },
    { key: 'calidad', label: 'Calidad', chartType: 'line', formatValue: (v) => `${v}/5` },
  ],
};

export const DEFAULT_CHART_METRIC: Record<ProgressTab, ChartMetric> = {
  actividad: 'tiempo',
  peso:      'peso',
  dolor:     'dolor',
  rehab:     'adherencia',
  sueno:     'horas',
};

export const TAB_CHART_COLOR: Record<ProgressTab, string> = {
  actividad: '#54715a',
  peso:      '#b56b45',
  dolor:     '#ef4444',
  rehab:     '#13201a',
  sueno:     '#d9c4a1',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function matchesFilter(type: ActivityType, filter: ActivityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'movilidad') return type === 'mobility';
  return (type as string) === filter;
}

function getLast12WeekRanges(): { start: string; end: string; label: string }[] {
  const today = todayIso();
  return Array.from({ length: 12 }, (_, i) => {
    const weeksAgo = 11 - i;
    const end      = addDays(today, -(weeksAgo * 7));
    const start    = addDays(end, -6);
    const dObj     = new Date(end + 'T12:00:00');
    return { start, end, label: `${dObj.getDate()}/${dObj.getMonth() + 1}` };
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

// ── Weekly summary ──────────────────────────────────────────────────────────

export function getWeeklySummary(
  tab: ProgressTab,
  filter: ActivityFilter,
  data: ProgressStoreData,
): WeeklySummary {
  const today    = todayIso();
  const wEnd     = today;
  const wStart   = addDays(today, -6);
  const pwStart  = addDays(today, -13);
  const pwEnd    = addDays(today, -7);

  switch (tab) {
    case 'actividad': {
      const acts = data.activities.filter((a) => a.date >= wStart && a.date <= wEnd && matchesFilter(a.type, filter));
      const totalMinutes  = acts.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
      const sessions      = acts.length;
      const gymActs       = acts.filter((a) => a.type === 'gym');
      const distActs      = acts.filter((a) => a.distanceKm != null);
      const hrActs        = acts.filter((a) => a.avgHeartRateBpm != null);
      const totalVolumeKg = gymActs.length > 0 ? gymActs.reduce((s, a) => s + (a.totalVolumeKg ?? 0), 0) : null;
      const distanceKm    = distActs.length > 0 ? Number(distActs.reduce((s, a) => s + (a.distanceKm ?? 0), 0).toFixed(1)) : null;
      const avgHrBpm      = hrActs.length > 0 ? Math.round(hrActs.reduce((s, a) => s + (a.avgHeartRateBpm ?? 0), 0) / hrActs.length) : null;
      return { tab: 'actividad', totalMinutes, sessions, totalVolumeKg, distanceKm, avgHrBpm };
    }

    case 'peso': {
      const thisWeek = data.weightEntries.filter((w) => w.date >= wStart && w.date <= wEnd);
      const lastWeek = data.weightEntries.filter((w) => w.date >= pwStart && w.date <= pwEnd);
      const sorted   = [...data.weightEntries].sort((a, b) => a.date.localeCompare(b.date));
      const currentKg   = sorted[sorted.length - 1]?.weightKg ?? null;
      const thisAvg     = avg(thisWeek.map((w) => w.weightKg));
      const lastAvg     = avg(lastWeek.map((w) => w.weightKg));
      const weeklyChange = thisAvg !== null && lastAvg !== null ? Number((thisAvg - lastAvg).toFixed(1)) : null;
      return { tab: 'peso', currentKg, weeklyChange, weeklyAvg: thisAvg };
    }

    case 'dolor': {
      const thisLogs = data.injuryLogs.filter((l) => l.date >= wStart && l.date <= wEnd);
      const prevLogs = data.injuryLogs.filter((l) => l.date >= pwStart && l.date <= pwEnd);
      const avgThis = avg(thisLogs.map((l) => l.painLevel));
      const avgPrev = avg(prevLogs.map((l) => l.painLevel));
      let trend: PainSummary['trend'] = null;
      if (avgThis !== null && avgPrev !== null) {
        if (avgThis < avgPrev - 0.3) trend = 'mejorando';
        else if (avgThis > avgPrev + 0.3) trend = 'empeorando';
        else trend = 'estable';
      }
      return { tab: 'dolor', avg: avgThis, prevAvg: avgPrev, trend };
    }

    case 'rehab': {
      const week = weekDates();
      const daysCompleted = week.filter((d) => data.checkIns.some((c) => c.date === d && c.habits.rehab)).length;
      return { tab: 'rehab', daysCompleted, pct: Math.round((daysCompleted / 7) * 100) };
    }

    case 'sueno': {
      const entries = data.sleepEntries.filter((s) => s.date >= wStart && s.date <= wEnd);
      const avgH   = avg(entries.map((e) => e.durationH));
      const totalH = entries.length > 0 ? Number(entries.reduce((s, e) => s + e.durationH, 0).toFixed(1)) : null;
      const avgQ   = avg(entries.map((e) => e.quality));
      return { tab: 'sueno', avgH, totalH, avgQuality: avgQ };
    }
  }
}

// ── 12-week chart data ───────────────────────────────────────────────────────

export function get12WeekChartData(
  tab: ProgressTab,
  filter: ActivityFilter,
  metric: ChartMetric,
  data: ProgressStoreData,
): ChartPoint[] {
  return getLast12WeekRanges().map(({ start, end, label }) => {
    let value: number | null = null;

    switch (tab) {
      case 'actividad': {
        const acts = data.activities.filter((a) => a.date >= start && a.date <= end && matchesFilter(a.type, filter));
        if (metric === 'tiempo')    value = acts.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
        if (metric === 'sesiones')  value = acts.length;
        if (metric === 'distancia') {
          const km = acts.reduce((s, a) => s + (a.distanceKm ?? 0), 0);
          value = km > 0 ? Number(km.toFixed(1)) : null;
        }
        break;
      }
      case 'peso': {
        const entries = data.weightEntries.filter((w) => w.date >= start && w.date <= end);
        value = avg(entries.map((w) => w.weightKg));
        break;
      }
      case 'dolor': {
        const logs = data.injuryLogs.filter((l) => l.date >= start && l.date <= end);
        value = avg(logs.map((l) => l.painLevel));
        break;
      }
      case 'rehab': {
        const days = datesInRange(start, end).filter((d) => data.checkIns.some((c) => c.date === d && c.habits.rehab)).length;
        value = Math.round((days / 7) * 100);
        break;
      }
      case 'sueno': {
        const entries = data.sleepEntries.filter((s) => s.date >= start && s.date <= end);
        if (metric === 'horas')   value = avg(entries.map((e) => e.durationH));
        if (metric === 'calidad') value = avg(entries.map((e) => e.quality));
        break;
      }
    }

    return { label, value, weekStart: start };
  });
}

// ── Calendar dots ────────────────────────────────────────────────────────────

export function getCalendarDots(
  tab: ProgressTab,
  filter: ActivityFilter,
  year: number,
  month: number,
  data: ProgressStoreData,
): Record<string, string> {
  const result: Record<string, string> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let color: string | null = null;

    switch (tab) {
      case 'actividad': color = data.activities.some((a) => a.date === date && matchesFilter(a.type, filter)) ? 'bg-moss' : null; break;
      case 'peso':      color = data.weightEntries.some((w) => w.date === date) ? 'bg-ember' : null; break;
      case 'dolor':     color = data.injuryLogs.some((l) => l.date === date) ? 'bg-red-400' : null; break;
      case 'rehab':     color = data.checkIns.some((c) => c.date === date && c.habits.rehab) ? 'bg-ink' : null; break;
      case 'sueno':     color = data.sleepEntries.some((s) => s.date === date) ? 'bg-sand' : null; break;
    }

    if (color) result[date] = color;
  }

  return result;
}

// ── Streaks ──────────────────────────────────────────────────────────────────

export function getStreaks(data: ProgressStoreData): StreakItem[] {
  const today  = todayIso();
  const ciDates = new Set(data.checkIns.map((c) => c.date));

  let checkinStreak = 0;
  let cur = today;
  while (ciDates.has(cur)) { checkinStreak++; cur = addDays(cur, -1); }

  let rehabStreak = 0;
  cur = today;
  while (data.checkIns.some((c) => c.date === cur && c.habits.rehab)) { rehabStreak++; cur = addDays(cur, -1); }

  let weightWeeks = 0;
  for (let w = 0; w < 52; w++) {
    const end = addDays(today, -(w * 7));
    const start = addDays(end, -6);
    if (!data.weightEntries.some((e) => e.date >= start && e.date <= end)) break;
    weightWeeks++;
  }

  let activityWeeks = 0;
  for (let w = 0; w < 52; w++) {
    const end = addDays(today, -(w * 7));
    const start = addDays(end, -6);
    if (!data.activities.some((a) => a.date >= start && a.date <= end)) break;
    activityWeeks++;
  }

  return [
    { key: 'rehab',    label: 'Rehab',     value: rehabStreak,    unit: 'días',    iconName: 'heart'    },
    { key: 'checkin',  label: 'Check-in',  value: checkinStreak,  unit: 'días',    iconName: 'flame'    },
    { key: 'peso',     label: 'Peso',      value: weightWeeks,    unit: 'semanas', iconName: 'weight'   },
    { key: 'actividad',label: 'Actividad', value: activityWeeks,  unit: 'semanas', iconName: 'activity' },
  ];
}

// ── Trends ───────────────────────────────────────────────────────────────────

export function getTrends(data: ProgressStoreData): TrendItem[] {
  const today  = todayIso();
  const trends: TrendItem[] = [];

  // Pain improvement over last 4 weeks vs previous 4 weeks
  const l4Start  = addDays(today, -27);
  const p4Start  = addDays(today, -55);
  const p4End    = addDays(today, -28);
  const recentLogs = data.injuryLogs.filter((l) => l.date >= l4Start);
  const prevLogs   = data.injuryLogs.filter((l) => l.date >= p4Start && l.date <= p4End);
  if (recentLogs.length > 0 && prevLogs.length > 0) {
    const rAvg = recentLogs.reduce((s, l) => s + l.painLevel, 0) / recentLogs.length;
    const pAvg = prevLogs.reduce((s, l) => s + l.painLevel, 0) / prevLogs.length;
    if (pAvg > 0) {
      const pct = Math.round(((pAvg - rAvg) / pAvg) * 100);
      if (pct >= 10) trends.push({ key: 'dolor', text: `Tu dolor medio ha bajado un ${pct}% respecto al mes pasado.` });
    }
  }

  // Consecutive rehab weeks meeting ≥70%
  let rehabWeeks = 0;
  for (let w = 0; w < 12; w++) {
    const end = addDays(today, -(w * 7));
    const days = datesInRange(addDays(end, -6), end)
      .filter((d) => data.checkIns.some((c) => c.date === d && c.habits.rehab)).length;
    if (days / 7 >= 0.7) rehabWeeks++;
    else break;
  }
  if (rehabWeeks >= 2) trends.push({ key: 'rehab', text: `Has cumplido el objetivo de rehab ${rehabWeeks} semana${rehabWeeks > 1 ? 's' : ''} seguidas.` });

  // Activity increase last week vs previous week
  const lwStart  = addDays(today, -6);
  const pwStart2 = addDays(today, -13);
  const pwEnd2   = addDays(today, -7);
  const lwMins = data.activities.filter((a) => a.date >= lwStart).reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
  const pwMins = data.activities.filter((a) => a.date >= pwStart2 && a.date <= pwEnd2).reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
  if (pwMins > 0 && lwMins > pwMins) {
    const pct = Math.round(((lwMins - pwMins) / pwMins) * 100);
    if (pct >= 10) trends.push({ key: 'actividad', text: `Tu actividad ha aumentado un ${pct}% respecto a la semana anterior.` });
  }

  // Consecutive weeks with weight entry
  let weightWeeks = 0;
  for (let w = 0; w < 52; w++) {
    const end = addDays(today, -(w * 7));
    const start = addDays(end, -6);
    if (!data.weightEntries.some((e) => e.date >= start && e.date <= end)) break;
    weightWeeks++;
  }
  if (weightWeeks >= 3) trends.push({ key: 'peso', text: `Has registrado tu peso ${weightWeeks} semanas consecutivas.` });

  if (trends.length === 0) {
    trends.push({ key: 'default', text: 'Buen ritmo. La consistencia vale más que un día de esfuerzo.' });
  }

  return trends;
}
