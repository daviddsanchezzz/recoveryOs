'use client';

import { BarChart, Bar, ResponsiveContainer, YAxis, Tooltip, Cell } from 'recharts';
import { Plus, ChevronRight, TrendingDown, TrendingUp, Minus, FlameKindling, Beef, Wheat, Droplets } from 'lucide-react';
import { useState } from 'react';

// ── Fake data ─────────────────────────────────────────────────────────────────

const WEEKS = [
  { label: '7/4',  v: 2180 }, { label: '14/4', v: 2310 }, { label: '21/4', v: 2240 },
  { label: '28/4', v: 2290 }, { label: '5/5',  v: 2450 }, { label: '12/5', v: 2380 },
  { label: '19/5', v: 2200 }, { label: '26/5', v: 2340 }, { label: '2/6',  v: 2410 },
  { label: '9/6',  v: 2280 }, { label: '16/6', v: 2350 }, { label: '19/6', v: 2340 },
];

const WEEKS_PROTEIN = [
  { label: '7/4',  v: 138 }, { label: '14/4', v: 149 }, { label: '21/4', v: 142 },
  { label: '28/4', v: 151 }, { label: '5/5',  v: 162 }, { label: '12/5', v: 155 },
  { label: '19/5', v: 144 }, { label: '26/5', v: 158 }, { label: '2/6',  v: 163 },
  { label: '9/6',  v: 148 }, { label: '16/6', v: 156 }, { label: '19/6', v: 158 },
];

const WEEKS_CARBS = [
  { label: '7/4',  v: 240 }, { label: '14/4', v: 268 }, { label: '21/4', v: 255 },
  { label: '28/4', v: 271 }, { label: '5/5',  v: 290 }, { label: '12/5', v: 278 },
  { label: '19/5', v: 245 }, { label: '26/5', v: 262 }, { label: '2/6',  v: 275 },
  { label: '9/6',  v: 258 }, { label: '16/6', v: 265 }, { label: '19/6', v: 262 },
];

const WEEKS_FAT = [
  { label: '7/4',  v: 72 }, { label: '14/4', v: 85 }, { label: '21/4', v: 78 },
  { label: '28/4', v: 80 }, { label: '5/5',  v: 92 }, { label: '12/5', v: 88 },
  { label: '19/5', v: 76 }, { label: '26/5', v: 81 }, { label: '2/6',  v: 87 },
  { label: '9/6',  v: 79 }, { label: '16/6', v: 83 }, { label: '19/6', v: 81 },
];

type MetricKey = 'kcal' | 'prot' | 'carbos' | 'grasas';

const METRIC_OPTIONS: { key: MetricKey; label: string; data: { label: string; v: number }[]; unit: string; color: string; fmt: (v: number) => string }[] = [
  { key: 'kcal',   label: 'Calorías', data: WEEKS,         unit: 'kcal', color: '#b56b45', fmt: (v) => `${v.toLocaleString('es')} kcal` },
  { key: 'prot',   label: 'Proteína', data: WEEKS_PROTEIN, unit: 'g',    color: '#54715a', fmt: (v) => `${v}g`  },
  { key: 'carbos', label: 'Carbos',   data: WEEKS_CARBS,   unit: 'g',    color: '#d9c4a1', fmt: (v) => `${v}g`  },
  { key: 'grasas', label: 'Grasas',   data: WEEKS_FAT,     unit: 'g',    color: '#a89068', fmt: (v) => `${v}g`  },
];

const DAYS_WEEK = [
  { d: 'L', kcal: 2210, logged: true  },
  { d: 'M', kcal: 2380, logged: true  },
  { d: 'X', kcal: 2290, logged: true  },
  { d: 'J', kcal:    0, logged: false },
  { d: 'V', kcal: 2450, logged: true  },
  { d: 'S', kcal: 2340, logged: true  },
  { d: 'D', kcal:    0, logged: false },
];

const MACROS = [
  { label: 'Proteína',      icon: Beef,          value: 158, goal: 160, unit: 'g',  pct: 99, barColor: '#54715a' },
  { label: 'Carbohidratos', icon: Wheat,         value: 262, goal: 280, unit: 'g',  pct: 94, barColor: '#b56b45' },
  { label: 'Grasas',        icon: FlameKindling, value: 81,  goal: 90,  unit: 'g',  pct: 90, barColor: '#d9c4a1' },
  { label: 'Hidratación',   icon: Droplets,      value: 2.1, goal: 2.5, unit: 'L',  pct: 84, barColor: '#7ba7b8' },
];

const INSIGHTS = [
  { key: 'protein',   text: 'Proteína cerca del objetivo 5 de 7 días — ideal para recuperación muscular.',       dir: 'positive' as const },
  { key: 'calories',  text: 'Calorías estables (±180 kcal) durante toda la semana.',                             dir: 'neutral'  as const },
  { key: 'hydration', text: 'Hidratación por debajo del objetivo 4 de 7 días (media 2.1 L vs meta 2.5 L).', dir: 'negative' as const },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function NutricionMockup() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('kcal');

  const metric = METRIC_OPTIONS.find((m) => m.key === activeMetric)!;
  const lastV  = metric.data[metric.data.length - 1].v;
  const prevV  = metric.data[metric.data.length - 2].v;
  const diff   = lastV - prevV;

  return (
    <div className="px-4 pt-1 space-y-5 pb-4">

      {/* ── Esta semana ──────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Esta semana</p>
          <span className="rounded-full bg-ember/15 px-2 py-0.5 text-[10px] font-semibold text-ember uppercase tracking-wide">Muestra</span>
        </div>
        <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
          {/* Hero: calories + delta */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-ink leading-tight">
                2.340
                <span className="text-base font-semibold text-ink/30"> kcal</span>
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mt-0.5">Promedio diario</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold leading-tight text-moss">+180</p>
              <p className="text-[10px] text-ink/35 font-medium mt-0.5">vs sem. ant.</p>
            </div>
          </div>

          {/* Macro chips */}
          <div className="flex gap-5 pt-3 border-t border-ink/6">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-ink">158g</span>
              <span className="text-[11px] text-ink/40">prot.</span>
              <span className="text-[10px] font-semibold text-moss ml-0.5">+8g</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-ink">262g</span>
              <span className="text-[11px] text-ink/40">carbos</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-ink">81g</span>
              <span className="text-[11px] text-ink/40">grasas</span>
              <span className="text-[10px] font-semibold text-ember ml-0.5">+5g</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1.5">
            <button type="button" className="h-8 w-8 rounded-2xl bg-ink flex items-center justify-center active:scale-95 transition-transform">
              <Plus size={14} className="text-white" />
            </button>
            <button type="button" className="h-8 w-8 rounded-2xl bg-ink/8 flex items-center justify-center active:scale-95 transition-transform">
              <ChevronRight size={14} className="text-ink/40" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Chart ────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Evolución · 12 semanas</p>
        <div className="rounded-4xl bg-white shadow-card px-4 pt-4 pb-3 space-y-2">
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metric.data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }} barSize={14}>
                <YAxis
                  tickFormatter={(v) =>
                    activeMetric === 'kcal'
                      ? `${(v / 1000).toFixed(1)}k`
                      : `${v}g`
                  }
                  tickCount={4}
                  width={34}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'rgba(19,32,26,0.35)' }}
                />
                <Tooltip
                  formatter={(v) => [typeof v === 'number' ? metric.fmt(v) : v, '']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,.10)', fontSize: 12 }}
                  cursor={{ fill: 'rgba(19,32,26,0.04)' }}
                />
                <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                  {metric.data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === metric.data.length - 1
                        ? metric.color
                        : `${metric.color}55`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-1">
            {METRIC_OPTIONS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setActiveMetric(m.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  activeMetric === m.key ? 'bg-ink text-white' : 'text-ink/40'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Objetivos semana ─────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Objetivos semana</p>
        <div className="rounded-4xl bg-white shadow-card p-5 space-y-5">
          {MACROS.map(({ label, icon: Icon, value, goal, unit, pct, barColor }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={13} className="text-ink/35 flex-shrink-0" />
                  <p className="text-sm font-semibold text-ink">{label}</p>
                </div>
                <div className="flex items-baseline gap-1 flex-shrink-0">
                  <span className="text-sm font-bold text-ink">{value}{unit}</span>
                  <span className="text-xs text-ink/30">/ {goal}{unit}</span>
                  <span className={`text-xs font-semibold ml-1 ${pct >= 90 ? 'text-moss' : pct >= 70 ? 'text-ember' : 'text-red-400'}`}>
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Registro diario ──────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Registro diario</p>
        <div className="rounded-4xl bg-white shadow-card px-5 py-4">
          <div className="flex justify-between">
            {DAYS_WEEK.map(({ d, kcal, logged }) => (
              <div key={d} className="flex flex-col items-center gap-2">
                <p className="text-[11px] font-semibold text-ink/40 uppercase">{d}</p>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${logged ? 'bg-ember-light' : 'bg-canvas'}`}>
                  <p className={`text-[9px] font-bold leading-tight text-center ${logged ? 'text-ember' : 'text-ink/20'}`}>
                    {logged ? `${(kcal / 1000).toFixed(1)}k` : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Insights ─────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Insights</p>
        <div className="rounded-4xl bg-white shadow-card overflow-hidden divide-y divide-ink/5">
          {INSIGHTS.map(({ key, text, dir }) => {
            const Icon  = dir === 'positive' ? TrendingDown : dir === 'negative' ? TrendingUp : Minus;
            const color = dir === 'positive' ? 'text-moss' : dir === 'negative' ? 'text-red-500' : 'text-ink/30';
            return (
              <div key={key} className="flex gap-3 px-5 py-4 items-start">
                <Icon size={15} className={`${color} flex-shrink-0 mt-0.5`} />
                <p className="text-sm text-ink leading-snug">{text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
