'use client';

import { useState } from 'react';
import { X, Plus, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { WeightSheet } from './weight-sheet';
import { Portal } from './portal';

function relativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} días`;
}

function fullDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function WeightScreen({ onClose }: { onClose: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate]   = useState(() => new Date().toISOString().slice(0, 10));

  const { weightEntries } = useRecoveryStore();

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const chartEntries = sorted.slice(-14);

  const maxW = chartEntries.reduce((m, e) => Math.max(m, e.weightKg), 0);
  const minW = chartEntries.reduce((m, e) => Math.min(m, e.weightKg), 999);
  const range = maxW - minW || 1;

  const latest = sorted[sorted.length - 1];
  const prev   = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const delta  = latest && prev ? Number((latest.weightKg - prev.weightKg).toFixed(1)) : null;

  const TrendIcon = delta === null ? null : delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
  const trendColor = delta === null ? '' : delta < 0 ? 'text-moss' : delta > 0 ? 'text-ember' : 'text-ink/40';

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] bg-canvas flex flex-col animate-slide-up"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-moss" />
            <h1 className="text-2xl font-bold text-ink">Peso</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center"
          >
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">

          {/* Latest + delta */}
          {latest && (
            <div className="rounded-4xl bg-ink p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Último</p>
                <p className="text-4xl font-bold text-white mt-1 leading-none">
                  {latest.weightKg.toFixed(1)}
                  <span className="text-lg font-normal text-white/50 ml-1">kg</span>
                </p>
                <p className="text-xs text-white/40 mt-1">{relativeDate(latest.date)}</p>
              </div>
              {TrendIcon && delta !== null && (
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <TrendIcon size={16} className={trendColor} />
                    <span className={`text-xl font-bold ${trendColor}`}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">vs anterior</p>
                </div>
              )}
            </div>
          )}

          {/* Bar chart */}
          {chartEntries.length >= 2 && (
            <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/30">
                Evolución — últimas {chartEntries.length} entradas
              </p>
              <div className="flex items-end gap-1.5 h-32">
                {chartEntries.map((entry) => {
                  const pct = ((entry.weightKg - minW) / range) * 65 + 35;
                  const isLatest = entry.id === latest?.id;
                  return (
                    <div key={entry.id} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[9px] text-ink/40 font-medium leading-none">
                        {entry.weightKg.toFixed(1)}
                      </span>
                      <div className="w-full rounded-xl overflow-hidden bg-canvas flex-1 flex items-end">
                        <div
                          className={`w-full rounded-xl transition-all duration-700 ${
                            isLatest ? 'bg-ink' : 'bg-ink/30'
                          }`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-ink/30 leading-none">
                        {entry.date.slice(8, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-ink/30">
                <span>Mín: {minW.toFixed(1)} kg</span>
                <span>Máx: {maxW.toFixed(1)} kg</span>
              </div>
            </div>
          )}

          {chartEntries.length === 0 && (
            <div className="rounded-4xl bg-canvas-light border border-sand/40 p-8 flex flex-col items-center gap-2 text-center">
              <Scale size={24} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin registros de peso aún</p>
              <p className="text-xs text-ink/25">Pulsa + para añadir el primero</p>
            </div>
          )}

          {/* History list */}
          {sorted.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
                Historial
              </p>
              {[...sorted].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-3xl bg-white shadow-card px-4 py-3 flex items-center justify-between"
                >
                  <p className="text-sm text-ink/50 capitalize">{fullDate(entry.date)}</p>
                  <p className="text-base font-bold text-ink">
                    {entry.weightKg.toFixed(1)}
                    <span className="text-xs font-normal text-ink/40"> kg</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAB */}
        <div
          className="fixed right-5 z-[71]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        >
          <button
            type="button"
            onClick={() => {
              setAddDate(new Date().toISOString().slice(0, 10));
              setShowAdd(true);
            }}
            className="h-14 w-14 rounded-full bg-ink shadow-card-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={22} className="text-white" />
          </button>
        </div>
      </div>

      <WeightSheet
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        defaultDate={addDate}
      />
    </Portal>
  );
}
