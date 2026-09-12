'use client';

import { useState } from 'react';
import { Info, Plus, X } from 'lucide-react';
import { Portal } from './portal';
import { sleepScoreLabel } from '../lib/sleep';
import type { DayScoreResponse } from './day-score-card';

function fmtSleepH(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}

function StatRow({
  label,
  value,
  onAdd,
}: {
  label: string;
  value: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-ink/50">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-ink">{value}</span>
        <button
          type="button"
          onClick={onAdd}
          className="h-6 w-6 rounded-full bg-canvas flex items-center justify-center flex-shrink-0"
          aria-label={`Añadir ${label.toLowerCase()}`}
        >
          <Plus size={11} className="text-ink/50" />
        </button>
      </div>
    </div>
  );
}

export function DayScoreDetailSheet({
  isOpen,
  onClose,
  data,
  onNavToProgreso,
  hasActiveInjuries,
  todayWeightKg,
  onAddSleep,
  onAddWeight,
  onAddPain,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: DayScoreResponse;
  onNavToProgreso?: () => void;
  hasActiveInjuries: boolean;
  todayWeightKg: number | null;
  onAddSleep: () => void;
  onAddWeight: () => void;
  onAddPain: () => void;
}) {
  const [showHrvInfo, setShowHrvInfo] = useState(false);

  if (!isOpen || data.score == null) return null;
  const { sleep, hrv, pain, load } = data.components;

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
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Por qué {data.score}</p>
                <p className="text-xl font-bold text-ink mt-0.5">{data.label}</p>
              </div>
              <button type="button" onClick={onClose}
                className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center flex-shrink-0">
                <X size={15} className="text-ink/60" />
              </button>
            </div>

            {data.explanation && <p className="text-sm text-ink/60 leading-relaxed">{data.explanation}</p>}

            <div className="rounded-3xl bg-white shadow-card px-4 divide-y divide-ink/5">
              <StatRow
                label="Sueño anoche"
                value={sleep.durationH != null
                  ? `${fmtSleepH(sleep.durationH)} · ${sleepScoreLabel(sleep.score ?? 0).toLowerCase()}`
                  : 'Sin datos'}
                onAdd={onAddSleep}
              />
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-ink/50">HRV</span>
                    <button
                      type="button"
                      onClick={() => setShowHrvInfo((visible) => !visible)}
                      className="h-5 w-5 rounded-full bg-canvas flex items-center justify-center"
                      aria-label="Qué es el HRV"
                      aria-expanded={showHrvInfo}
                      aria-controls="hrv-explanation"
                    >
                      <Info size={11} className="text-ink/50" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-ink">
                    {hrv.valueMs != null
                      ? `${hrv.valueMs} ms${hrv.deltaPct != null ? ` · ${hrv.deltaPct > 0 ? '↑' : '↓'}${Math.abs(hrv.deltaPct)}%` : ''}`
                      : 'Sin datos'}
                  </span>
                </div>
                {showHrvInfo && (
                  <p id="hrv-explanation" className="mt-2 text-xs leading-relaxed text-ink/50">
                    El HRV es la variación del tiempo entre latidos, medida en milisegundos. Comparado con tu media habitual, ayuda a estimar cómo de recuperado está tu cuerpo: un valor más bajo puede indicar fatiga o estrés.
                  </p>
                )}
              </div>
              {hasActiveInjuries && (
                <StatRow
                  label="Dolor"
                  value={pain.avgPainLevel != null ? `${pain.avgPainLevel}/10` : 'Sin registrar hoy'}
                  onAdd={onAddPain}
                />
              )}
              <StatRow
                label="Peso"
                value={todayWeightKg != null ? `${todayWeightKg.toFixed(1)} kg` : 'Sin registrar'}
                onAdd={onAddWeight}
              />
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-ink/50">Carga usada</span>
                <span className="text-right text-sm font-semibold text-ink">
                  {load.score != null
                    ? `${load.score}/100${load.ratio != null ? ` · ratio ${load.ratio.toFixed(2).replace('.', ',')}` : ''}`
                    : 'Sin datos'}
                </span>
              </div>
              <div className="py-3 space-y-1">
                <span className="text-sm text-ink/50">Cómo se calcula</span>
                <p className="text-xs text-ink/40">
                  sueño {data.weights.sleep}% · HRV {data.weights.hrv}% · dolor {data.weights.pain}% · carga {data.weights.load}%
                </p>
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
