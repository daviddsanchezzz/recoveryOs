'use client';

import { useCallback, useMemo, useState } from 'react';
import { LayoutGrid, Dumbbell, Bike, Footprints, Waves, Zap, Activity } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { WeightScreen } from './weight-screen';
import { LesionesScreen } from './lesiones-screen';
import { SuenoScreen } from './sueno-screen';
import {
  type ProgressTab,
  type ActivityFilter,
  type ChartMetric,
  getWeeklySummary,
  get12WeekChartData,
  getLast12WeightChartData,
  getCalendarDots,
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

// ── Static config ────────────────────────────────────────────────────────────

const TABS: { id: ProgressTab; label: string }[] = [
  { id: 'actividad', label: 'Actividad' },
  { id: 'peso',      label: 'Peso'      },
  { id: 'dolor',     label: 'Dolor'     },
  { id: 'rehab',     label: 'Rehab'     },
  { id: 'sueno',     label: 'Sueño'     },
];

const ACTIVITY_FILTERS: { id: ActivityFilter; label: string; Icon: React.ElementType }[] = [
  { id: 'all',       label: 'Todo',      Icon: LayoutGrid },
  { id: 'gym',       label: 'Gym',       Icon: Dumbbell   },
  { id: 'bike',      label: 'Bici',      Icon: Bike       },
  { id: 'run',       label: 'Correr',    Icon: Activity   },
  { id: 'walk',      label: 'Caminar',   Icon: Footprints },
  { id: 'swim',      label: 'Natación',  Icon: Waves      },
  { id: 'rehab',     label: 'Rehab',     Icon: Zap        },
  { id: 'movilidad', label: 'Movilidad', Icon: Zap        },
];

// ── Component ────────────────────────────────────────────────────────────────

export function ProgressScreen() {
  const [activeTab,        setActiveTab]        = useState<ProgressTab>('actividad');
  const [activityFilter,   setActivityFilter]   = useState<ActivityFilter>('all');
  const [chartMetric,      setChartMetric]      = useState<ChartMetric>('tiempo');
  const [showWeightScreen,   setShowWeightScreen]   = useState(false);
  const [showLesionesScreen, setShowLesionesScreen] = useState(false);
  const [showSuenoScreen,    setShowSuenoScreen]    = useState(false);

  const { activities, weightEntries, injuryLogs, checkIns, sleepEntries, selectedDate, setSelectedDate } =
    useRecoveryStore();

  const storeData = useMemo(
    () => ({ activities, weightEntries, injuryLogs, checkIns, sleepEntries }),
    [activities, weightEntries, injuryLogs, checkIns, sleepEntries],
  );

  function handleTabChange(tab: ProgressTab) {
    setActiveTab(tab);
    setChartMetric(DEFAULT_CHART_METRIC[tab]);
  }

  const summary   = useMemo(() => getWeeklySummary(activeTab, activityFilter, storeData),       [activeTab, activityFilter, storeData]);
  const chartData = useMemo(
    () => activeTab === 'peso'
      ? getLast12WeightChartData(storeData)
      : get12WeekChartData(activeTab, activityFilter, chartMetric, storeData),
    [activeTab, activityFilter, chartMetric, storeData],
  );
  const streaks   = useMemo(() => getStreaks(storeData),   [storeData]);
  const trends    = useMemo(() => getTrends(storeData),    [storeData]);

  const getDots = useCallback(
    (y: number, m: number) => getCalendarDots(activeTab, activityFilter, y, m, storeData),
    [activeTab, activityFilter, storeData],
  );

  const metricOptions      = CHART_METRIC_OPTIONS[activeTab];
  const activeMetricOption = metricOptions.find((o) => o.key === chartMetric) ?? metricOptions[0];
  const chartColor         = TAB_CHART_COLOR[activeTab];

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

        {/* Activity sub-filter (only when Actividad is active) */}
        {activeTab === 'actividad' && (
          <div className="flex gap-2 overflow-x-auto px-4" style={{ scrollbarWidth: 'none' }}>
            {ACTIVITY_FILTERS.map(({ id, label, Icon }) => {
              const isActive = activityFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActivityFilter(id)}
                  aria-label={label}
                  className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl transition-all duration-200 ${
                    id === 'all'
                      ? 'px-3 py-1.5'
                      : 'h-9 w-9 justify-center'
                  } ${isActive ? 'bg-moss text-white' : 'bg-white text-ink/40 shadow-card'}`}
                >
                  <Icon size={15} />
                  {id === 'all' && (
                    <span className="text-xs font-semibold">{label}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-4 space-y-5 pt-1">

        {/* 1 — Weekly summary */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Esta semana</p>
          <ProgressWeeklySummary
            summary={summary}
            onWeightPress={() => setShowWeightScreen(true)}
            onDolorPress={() => setShowLesionesScreen(true)}
            onSuenoPress={() => setShowSuenoScreen(true)}
          />
        </div>

        {/* 2 — Chart */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">
            {activeTab === 'peso' ? 'Últimos 12 registros' : 'Evolución · 12 semanas'}
          </p>
          <div className="rounded-4xl bg-white shadow-card px-4 pt-4 pb-3 space-y-1">
          <ProgressChart
            data={chartData}
            type={activeMetricOption.chartType}
            color={chartColor}
            formatValue={activeMetricOption.formatValue}
          />

          {/* Metric selector (only when multiple options) */}
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

        {/* 3 — Inline monthly calendar */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Este mes</p>
          <ProgressCalendar
            getDots={getDots}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </div>

        {/* 4 — Streaks */}
        <ProgressStreaks streaks={streaks} />

        {/* 5 — Trends */}
        <ProgressTrends trends={trends} />
      </div>

      {showWeightScreen   && <WeightScreen    onClose={() => setShowWeightScreen(false)} />}
      {showLesionesScreen && <LesionesScreen  onClose={() => setShowLesionesScreen(false)} />}
      {showSuenoScreen    && <SuenoScreen     onClose={() => setShowSuenoScreen(false)} />}
    </div>
  );
}
