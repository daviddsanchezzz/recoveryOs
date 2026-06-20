'use client';

import { useCallback, useMemo, useState } from 'react';
import { LayoutGrid, Dumbbell, Bike, Footprints, Waves, HeartPulse, RefreshCw, Timer } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { WeightScreen } from './weight-screen';
import { LesionesScreen } from './lesiones-screen';
import { SuenoScreen } from './sueno-screen';
import { WeightSheet } from './weight-sheet';
import { SleepSheet } from './sleep-sheet';
import { DolorSheet } from './dolor-sheet';
import { AddActivitySheet } from './add-activity-sheet';
import { todayIso, sameDay } from '../lib/date';
import type { ProgressStoreData } from '../lib/progress-metrics';
import {
  type ProgressTab,
  type ActivityFilter,
  type ChartMetric,
  getWeeklySummary,
  get12WeekChartData,
  getLast12WeightChartData,
  getCalendarDots,
  getResumenCalendarDots,
  getStreaks,
  getTrends,
  CHART_METRIC_OPTIONS,
  DEFAULT_CHART_METRIC,
  TAB_CHART_COLOR,
} from '../lib/progress-metrics';
import { ProgressWeeklySummary } from './progress-weekly-summary';
import { ProgressChart }         from './progress-chart';
import { ProgressCalendar }      from './progress-calendar';
import { ProgressStreaks }        from './progress-streaks';
import { ProgressTrends }        from './progress-trends';
import { ProgressDaySummary }    from './progress-day-summary';
import { NutricionMockup }       from './nutricion-mockup';

// ── Calendar day detail ───────────────────────────────────────────────────────

const ACT_LABELS: Record<string, string> = {
  gym: 'Gym', bike: 'Bici', run: 'Correr', walk: 'Caminar',
  swim: 'Natación', rehab: 'Rehab', mobility: 'Movilidad', hiit: 'HIIT',
};

function fmtMin(v: number): string {
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function fmtSleepH(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}

function CalendarDayDetail({ tab, date, data }: {
  tab: ProgressTab;
  date: string;
  data: ProgressStoreData;
}) {
  const label = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  let hasData = false;
  let body: React.ReactNode;

  if (tab === 'actividad') {
    const acts = data.activities.filter((a) => sameDay(a.date, date));
    hasData = acts.length > 0;
    body = hasData ? (
      <div className="divide-y divide-ink/5">
        {acts.map((act) => (
          <div key={act.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <p className="text-sm font-semibold text-ink">{ACT_LABELS[act.type] ?? act.type}</p>
            <p className="text-sm text-ink/50">{act.durationMinutes ? fmtMin(act.durationMinutes) : '--'}</p>
          </div>
        ))}
      </div>
    ) : <p className="text-sm text-ink/30">Sin actividad este día</p>;

  } else if (tab === 'peso') {
    const entry = data.weightEntries.find((w) => sameDay(w.date, date));
    hasData = !!entry;
    body = entry ? (
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/50">Peso registrado</p>
        <p className="text-xl font-bold text-ink">
          {entry.weightKg.toFixed(1)}<span className="text-sm font-normal text-ink/40"> kg</span>
        </p>
      </div>
    ) : <p className="text-sm text-ink/30">Sin registro de peso</p>;

  } else if (tab === 'lesion') {
    const logs = data.injuryLogs.filter((l) => sameDay(l.date, date));
    const hasRehab = logs.some((l) => l.didRehab) ||
      data.checkIns.some((c) => sameDay(c.date, date) && c.habits.rehab);
    const avgPain = logs.length > 0
      ? (logs.reduce((s, l) => s + l.painLevel, 0) / logs.length).toFixed(1)
      : null;
    hasData = !!avgPain || hasRehab;
    body = hasData ? (
      <div className="space-y-2">
        {avgPain && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink/50">Dolor medio</p>
            <p className="text-xl font-bold text-ink">
              {avgPain}<span className="text-sm font-normal text-ink/40">/10</span>
            </p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink/50">Rehab</p>
          <p className={`text-sm font-semibold ${hasRehab ? 'text-moss' : 'text-ink/25'}`}>
            {hasRehab ? '✓ Completado' : '✗ No registrado'}
          </p>
        </div>
      </div>
    ) : <p className="text-sm text-ink/30">Sin datos de lesión este día</p>;

  } else if (tab === 'sueno') {
    const entry = data.sleepEntries.find((s) => sameDay(s.date, date));
    hasData = !!entry;
    body = entry ? (
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/50">Sueño registrado</p>
        <div className="text-right">
          <p className="text-base font-bold text-ink">{fmtSleepH(entry.durationH)}</p>
          <p className="text-xs text-ink/40">calidad {entry.quality}/5</p>
        </div>
      </div>
    ) : <p className="text-sm text-ink/30">Sin registro de sueño</p>;

  } else {
    return null;
  }

  return (
    <div className="rounded-3xl bg-white shadow-card px-5 py-4 space-y-2 animate-fade-in">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">{label}</p>
      {body}
    </div>
  );
}

// ── Static config ────────────────────────────────────────────────────────────

type AnyTab = ProgressTab | 'resumen' | 'nutricion';

const TABS: { id: AnyTab; label: string }[] = [
  { id: 'resumen',   label: 'Resumen'    },
  { id: 'actividad', label: 'Actividad'  },
  { id: 'peso',      label: 'Peso'       },
  { id: 'lesion',    label: 'Lesión'     },
  { id: 'sueno',     label: 'Sueño'      },
  { id: 'nutricion', label: 'Nutrición ✦' },
];

const ACTIVITY_FILTERS: { id: ActivityFilter; label: string; Icon: React.ElementType }[] = [
  { id: 'all',       label: 'Todo',      Icon: LayoutGrid },
  { id: 'gym',       label: 'Gym',       Icon: Dumbbell   },
  { id: 'bike',      label: 'Bici',      Icon: Bike       },
  { id: 'run',       label: 'Correr',    Icon: Timer      },
  { id: 'walk',      label: 'Caminar',   Icon: Footprints },
  { id: 'swim',      label: 'Natación',  Icon: Waves      },
  { id: 'rehab',     label: 'Rehab',     Icon: HeartPulse },
  { id: 'movilidad', label: 'Movilidad', Icon: RefreshCw  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function ProgressScreen({ onNavToActividades }: { onNavToActividades?: () => void } = {}) {
  const [activeTab,        setActiveTab]        = useState<AnyTab>('resumen');
  const [activityFilter,   setActivityFilter]   = useState<ActivityFilter>('all');
  const [chartMetric,      setChartMetric]      = useState<ChartMetric>('tiempo');
  const [showWeightScreen,   setShowWeightScreen]   = useState(false);
  const [showLesionesScreen, setShowLesionesScreen] = useState(false);
  const [showSuenoScreen,    setShowSuenoScreen]    = useState(false);
  const [showWeightSheet,    setShowWeightSheet]    = useState(false);
  const [showSleepSheet,     setShowSleepSheet]     = useState(false);
  const [showDolorSheet,     setShowDolorSheet]     = useState(false);
  const [showActivitySheet,  setShowActivitySheet]  = useState(false);

  const { activities, weightEntries, injuryLogs, checkIns, sleepEntries, selectedDate, setSelectedDate } =
    useRecoveryStore();

  const storeData = useMemo(
    () => ({ activities, weightEntries, injuryLogs, checkIns, sleepEntries }),
    [activities, weightEntries, injuryLogs, checkIns, sleepEntries],
  );

  function handleTabChange(tab: AnyTab) {
    setActiveTab(tab);
    if (tab !== 'nutricion' && tab !== 'resumen') setChartMetric(DEFAULT_CHART_METRIC[tab]);
  }

  const progressTab = (activeTab !== 'nutricion' && activeTab !== 'resumen') ? activeTab : 'actividad';

  const summary   = useMemo(() => getWeeklySummary(progressTab, activityFilter, storeData),       [progressTab, activityFilter, storeData]);
  const chartData = useMemo(
    () => progressTab === 'peso'
      ? getLast12WeightChartData(storeData)
      : get12WeekChartData(progressTab, activityFilter, chartMetric, storeData),
    [progressTab, activityFilter, chartMetric, storeData],
  );
  const streaks   = useMemo(() => getStreaks(storeData),   [storeData]);
  const trends    = useMemo(() => getTrends(storeData),    [storeData]);

  const getDots = useCallback(
    (y: number, m: number) => getCalendarDots(progressTab, activityFilter, y, m, storeData),
    [progressTab, activityFilter, storeData],
  );

  const getResumenDots = useCallback(
    (y: number, m: number) => getResumenCalendarDots(y, m, storeData),
    [storeData],
  );

  const metricOptions      = CHART_METRIC_OPTIONS[progressTab];
  const activeMetricOption = metricOptions.find((o) => o.key === chartMetric) ?? metricOptions[0];
  const chartColor         = TAB_CHART_COLOR[progressTab];

  return (
    <div className="pb-4 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-ink">Progreso</h1>
      </div>

      {/* ── Sticky tab bar ── */}
      <div className="sticky top-0 z-10 bg-canvas pt-1 pb-2 space-y-2">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto px-4" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex-shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink/50 shadow-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Activity sub-filter — flat icon-only style, distinct from main tabs */}
        {activeTab === 'actividad' && (
          <div className="flex overflow-x-auto px-4 pt-0.5" style={{ scrollbarWidth: 'none' }}>
            {ACTIVITY_FILTERS.map(({ id, label, Icon }) => {
              const isActive = activityFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActivityFilter(id)}
                  aria-label={label}
                  className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200"
                >
                  <Icon size={16} className={`transition-colors duration-200 ${isActive ? 'text-moss' : 'text-ink/25'}`} />
                  <span className={`h-1 w-1 rounded-full transition-all duration-200 ${isActive ? 'bg-moss' : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {activeTab === 'nutricion' ? (
        <NutricionMockup />
      ) : activeTab === 'resumen' ? (
        <div className="px-4 space-y-5 pt-1">
          {/* Calendar + day summary */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Este mes</p>
            <ProgressCalendar
              getDots={getResumenDots}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
            <ProgressDaySummary date={selectedDate} data={storeData} />
          </div>
          {/* Rachas */}
          <ProgressStreaks streaks={streaks} />
          {/* Insights */}
          <ProgressTrends trends={trends} />
        </div>
      ) : (
        <div className="px-4 space-y-5 pt-1">

          {/* 1 — Weekly summary */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Esta semana</p>
            <ProgressWeeklySummary
              summary={summary}
              onWeightPress={() => setShowWeightScreen(true)}
              onDolorPress={() => setShowLesionesScreen(true)}
              onSuenoPress={() => setShowSuenoScreen(true)}
              onWeightAdd={() => setShowWeightSheet(true)}
              onDolorAdd={() => setShowDolorSheet(true)}
              onSuenoAdd={() => setShowSleepSheet(true)}
              onActividadPress={onNavToActividades}
              onActividadAdd={() => setShowActivitySheet(true)}
            />
          </div>

          {/* 2 — Chart */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">
              {progressTab === 'peso' ? 'Últimos 12 registros' : 'Evolución · 12 semanas'}
            </p>
            <div className="rounded-4xl bg-white shadow-card px-4 pt-4 pb-3 space-y-1">
              <ProgressChart
                data={chartData}
                type={activeMetricOption.chartType}
                color={chartColor}
                formatValue={activeMetricOption.formatValue}
              />
              {metricOptions.length > 1 && (
                <div className="flex gap-1 pt-1">
                  {metricOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setChartMetric(opt.key)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                        chartMetric === opt.key ? 'bg-ink text-white' : 'text-ink/40 hover:text-ink/70'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3 — Inline monthly calendar + day detail */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Este mes</p>
            <ProgressCalendar
              getDots={getDots}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
            <CalendarDayDetail tab={progressTab} date={selectedDate} data={storeData} />
          </div>

          {/* 4 — Streaks */}
          <ProgressStreaks streaks={streaks} />

          {/* 5 — Trends */}
          <ProgressTrends trends={trends} />
        </div>
      )}

      {showWeightScreen   && <WeightScreen    onClose={() => setShowWeightScreen(false)} />}
      {showLesionesScreen && <LesionesScreen  onClose={() => setShowLesionesScreen(false)} />}
      {showSuenoScreen    && <SuenoScreen     onClose={() => setShowSuenoScreen(false)} />}

      <WeightSheet
        isOpen={showWeightSheet}
        onClose={() => setShowWeightSheet(false)}
        defaultDate={todayIso()}
      />
      <SleepSheet
        isOpen={showSleepSheet}
        onClose={() => setShowSleepSheet(false)}
      />
      <DolorSheet
        isOpen={showDolorSheet}
        onClose={() => setShowDolorSheet(false)}
      />
      <AddActivitySheet
        isOpen={showActivitySheet}
        onClose={() => setShowActivitySheet(false)}
      />
    </div>
  );
}
