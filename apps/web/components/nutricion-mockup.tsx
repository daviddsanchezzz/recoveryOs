'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, YAxis, Tooltip, Cell } from 'recharts';
import { FlameKindling, Beef } from 'lucide-react';
import { NutritionService } from '../lib/services';
import { useSessionStore } from '../stores/session-store';
import { useNutritionStore } from '../stores/nutrition-store';
import type { WeeklyNutrition } from '../stores/nutrition-store';

type MetricKey = 'kcal' | 'prot';

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getUTCDay()];
}

export function NutricionMockup() {
  const userId  = useSessionStore((s) => s.user?.id);
  const weeklyNutrition = useNutritionStore((s) => s.weeklyNutrition);
  const [metric,  setMetric]  = useState<MetricKey>('kcal');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    NutritionService.fetchWeeklyNutrition(userId)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="py-12 text-center text-ink/30 text-sm">Cargando...</div>
    );
  }

  if (!weeklyNutrition || weeklyNutrition.dailyData.length === 0) {
    return (
      <div className="px-4 pt-1 space-y-4 pb-4">
        <div className="rounded-4xl bg-white shadow-card px-5 py-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Media semanal</p>
          <div className="text-center py-8 text-ink/30 text-sm">
            Sin datos de nutrición esta semana.<br />
            Añade comidas en la pantalla Hoy.
          </div>
        </div>
      </div>
    );
  }

  const data: WeeklyNutrition = weeklyNutrition;

  const chartData = data.dailyData.map((d) => ({
    label: dayLabel(d.date),
    v: metric === 'kcal' ? d.calories : d.protein,
  }));

  const metricConfig = {
    kcal: { label: 'Calorías', color: '#b56b45', unit: 'kcal', avg: data.avgCalories, target: data.caloriesTarget },
    prot: { label: 'Proteína', color: '#54715a', unit: 'g',    avg: data.avgProtein,  target: data.proteinTarget },
  }[metric];

  const proteinPct = data.proteinTarget > 0
    ? Math.round((data.avgProtein / data.proteinTarget) * 100)
    : 0;

  const totalLoggedDays = data.totalLoggedDays;

  const insight = totalLoggedDays === 0
    ? 'Empieza a registrar comidas para ver tu progreso nutricional.'
    : data.daysHittingProtein >= 5
    ? `¡Buen trabajo con la proteína esta semana! Has cumplido el objetivo ${data.daysHittingProtein} de ${totalLoggedDays} días.`
    : data.daysHittingProtein >= 3
    ? `Te has quedado cerca del objetivo de proteína esta semana. ${data.daysHittingProtein} de ${totalLoggedDays} días cumplidos.`
    : `Esta semana ha costado llegar al objetivo de proteína. Media: ${data.avgProtein}g/día (objetivo: ${data.proteinTarget}g).`;

  return (
    <div className="px-4 pt-1 space-y-4 pb-4">

      {/* Weekly averages */}
      <div className="rounded-4xl bg-white shadow-card px-5 py-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Media semanal</p>
        <div className="flex gap-4">
          <div className="flex-1 rounded-2xl bg-canvas px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FlameKindling size={13} className="text-ember" />
              <span className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">Calorías</span>
            </div>
            <p className="text-xl font-bold text-ink">{data.avgCalories.toLocaleString('es')}</p>
            <p className="text-[10px] text-ink/40">/ {CALORIES_TARGET.toLocaleString('es')} kcal</p>
          </div>
          <div className="flex-1 rounded-2xl bg-canvas px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Beef size={13} className="text-moss" />
              <span className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">Proteína</span>
            </div>
            <p className="text-xl font-bold text-ink">{data.avgProtein}g</p>
            <p className="text-[10px] text-ink/40">/ {data.proteinTarget}g · {proteinPct}%</p>
          </div>
        </div>

        {/* Protein compliance */}
        {totalLoggedDays > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-ink/50">Cumplimiento proteína</span>
            <span className="text-xs font-semibold text-moss">
              {data.daysHittingProtein}/{totalLoggedDays} días
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="rounded-4xl bg-white shadow-card px-5 py-4 space-y-3">
        {/* Metric selector */}
        <div className="flex gap-2">
          {(['kcal', 'prot'] as MetricKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                metric === k
                  ? 'bg-ink text-white'
                  : 'bg-canvas text-ink/50'
              }`}
            >
              {k === 'kcal' ? 'Calorías' : 'Proteína'}
            </button>
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">
          Últimos 7 días · {metricConfig.label}
        </p>

        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={24}>
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                formatter={(v) => [`${v} ${metricConfig.unit}`, metricConfig.label]}
                contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
              />
              <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.v >= (metric === 'kcal' ? metricConfig.target * 0.8 : metricConfig.target)
                      ? metricConfig.color
                      : `${metricConfig.color}55`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insight */}
      <div className="rounded-4xl bg-ink px-5 py-4">
        <p className="text-xs text-white/60 font-semibold uppercase tracking-widest mb-1">Nutrición</p>
        <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}
