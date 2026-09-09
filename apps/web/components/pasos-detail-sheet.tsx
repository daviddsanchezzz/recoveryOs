'use client';

import { X } from 'lucide-react';
import { Portal } from './portal';
import { ProgressChart } from './progress-chart';
import { pickBySourcePrecedence, STEPS_GOAL } from '../lib/health-metrics';
import { addDays } from '../lib/date';
import type { DailyHealthMetricEntry } from '../stores/recovery-store';

export function PasosDetailSheet({
  isOpen,
  onClose,
  healthMetrics,
  selectedDate,
  onNavToProgreso,
}: {
  isOpen: boolean;
  onClose: () => void;
  healthMetrics: DailyHealthMetricEntry[];
  selectedDate: string;
  onNavToProgreso?: () => void;
}) {
  if (!isOpen) return null;

  const last7Dates = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i - 6));
  const chartData = last7Dates.map((date) => {
    const entry = pickBySourcePrecedence(healthMetrics, date);
    const d = new Date(date + 'T12:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return { label: `${day}/${mon}`, rangeLabel: `${day}/${mon}`, value: entry?.steps ?? 0, weekStart: date };
  });

  const todaySteps = chartData[chartData.length - 1]?.value ?? 0;
  const validDays = chartData.filter((p) => p.value > 0);
  const avg7d = validDays.length > 0
    ? Math.round(validDays.reduce((s, p) => s + (p.value as number), 0) / validDays.length)
    : 0;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-y-auto" style={{ maxHeight: '85vh' }}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="px-5 pt-2 pb-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Pasos</p>
                <p className="text-xl font-bold text-ink mt-0.5">
                  {todaySteps.toLocaleString('es-ES')} de {STEPS_GOAL.toLocaleString('es-ES')}
                </p>
              </div>
              <button type="button" onClick={onClose}
                className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center flex-shrink-0">
                <X size={15} className="text-ink/60" />
              </button>
            </div>

            <div className="rounded-4xl bg-white shadow-card px-4 pt-4 pb-3">
              <ProgressChart
                data={chartData}
                type="bar"
                color="#54715a"
                averageValue={avg7d}
                formatValue={(v) => `${v.toLocaleString('es-ES')} pasos`}
              />
            </div>

            <div className="rounded-3xl bg-white shadow-card px-4 divide-y divide-ink/5">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Tu media 7 días</span>
                <span className="text-sm font-semibold text-ink">{avg7d.toLocaleString('es-ES')}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Objetivo diario</span>
                <span className="text-sm font-semibold text-ink">{STEPS_GOAL.toLocaleString('es-ES')}</span>
              </div>
            </div>

            {onNavToProgreso && (
              <button
                type="button"
                onClick={() => { onClose(); onNavToProgreso(); }}
                className="w-full rounded-3xl bg-ink py-4 text-sm font-semibold text-white"
              >
                Ver histórico en Progreso
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
