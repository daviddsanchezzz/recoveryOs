'use client';

import { useState } from 'react';
import { X, Plus, Moon, Pencil, Trash2 } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { RecoveryService } from '../lib/services';
import { Portal } from './portal';
import { ProgressChart } from './progress-chart';
import { SleepSheet } from './sleep-sheet';
import type { SleepEntry } from '../stores/recovery-store';

const QUALITY_LABELS: Record<number, string> = { 1: 'Mala', 2: 'Regular', 3: 'Normal', 4: 'Buena', 5: 'Óptima' };
const QUALITY_COLORS: Record<number, string> = {
  1: 'text-red-400', 2: 'text-ember', 3: 'text-ink/50', 4: 'text-moss', 5: 'text-moss',
};

function relDate(iso: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtH(h: number): string {
  const wh = Math.floor(h);
  const m = Math.round((h - wh) * 60);
  if (m === 0) return `${wh}h`;
  return `${wh}h ${m}min`;
}

export function SuenoScreen({ onClose }: { onClose: () => void }) {
  const { sleepEntries } = useRecoveryStore();
  const [showSheet, setShowSheet] = useState(false);
  const [editEntry, setEditEntry] = useState<SleepEntry | null>(null);

  const sorted = [...sleepEntries].sort((a, b) => b.date.localeCompare(a.date));

  // Build chart data from last 12 sleep entries
  const last12 = [...sleepEntries].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
  const chartData = last12.map((e) => {
    const d = new Date(e.date + 'T12:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return { label: `${day}/${mon}`, rangeLabel: `${day}/${mon}`, value: e.durationH, weekStart: e.date };
  });

  const latest = sorted[0];
  const prev   = sorted[1];
  const deltaH = latest && prev ? Number((latest.durationH - prev.durationH).toFixed(1)) : null;

  function handleDelete(id: string) {
    RecoveryService.deleteSleep(id);
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] bg-canvas flex flex-col animate-slide-up"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Moon size={20} className="text-sand" />
            <h1 className="text-2xl font-bold text-ink">Sueño</h1>
          </div>
          <button type="button" onClick={onClose}
            className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center">
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">
          {/* Latest summary */}
          {latest && (
            <div className="rounded-4xl bg-ink p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Última noche</p>
                <p className="text-4xl font-bold text-white mt-1 leading-none">
                  {fmtH(latest.durationH)}
                </p>
                <p className="text-xs text-white/40 mt-1">{relDate(latest.date)} · {QUALITY_LABELS[latest.quality]}</p>
              </div>
              {deltaH !== null && (
                <div className="text-right">
                  <p className={`text-xl font-bold ${deltaH >= 0 ? 'text-moss' : 'text-ember'}`}>
                    {deltaH >= 0 ? '+' : ''}{deltaH}h
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">vs anterior</p>
                </div>
              )}
            </div>
          )}

          {/* Chart */}
          {chartData.length >= 2 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/30 px-1">
                Últimas {chartData.length} noches
              </p>
              <div className="rounded-4xl bg-white shadow-card px-4 pt-4 pb-3">
                <ProgressChart
                  data={chartData}
                  type="bar"
                  color="#d9c4a1"
                  formatValue={(v) => fmtH(v)}
                />
              </div>
            </div>
          )}

          {/* Empty state */}
          {sleepEntries.length === 0 && (
            <div className="rounded-4xl bg-canvas-light border border-sand/40 p-8 flex flex-col items-center gap-2 text-center">
              <Moon size={24} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin registros de sueño aún</p>
              <p className="text-xs text-ink/25">Pulsa + para añadir el primero</p>
            </div>
          )}

          {/* History */}
          {sorted.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">Historial</p>
              {sorted.map((entry) => (
                <div key={entry.id} className="rounded-3xl bg-white shadow-card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ink/50 capitalize">{relDate(entry.date)}</p>
                    <p className="text-base font-bold text-ink mt-0.5">{fmtH(entry.durationH)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${QUALITY_COLORS[entry.quality]}`}>{QUALITY_LABELS[entry.quality]}</p>
                      <p className="text-xs text-ink/30">{entry.quality}/5</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditEntry(entry)}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-canvas"
                    >
                      <Pencil size={12} className="text-ink/40" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-red-50"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-5 z-[71]">
        <button type="button" onClick={() => setShowSheet(true)}
          className="h-14 w-14 rounded-full bg-ink shadow-card-lg flex items-center justify-center active:scale-95 transition-transform">
          <Plus size={22} className="text-white" />
        </button>
      </div>

      <SleepSheet isOpen={showSheet} onClose={() => setShowSheet(false)} />

      <SleepSheet
        isOpen={editEntry !== null}
        onClose={() => setEditEntry(null)}
        editId={editEntry?.id}
        defaultDate={editEntry?.date}
        defaultDurationH={editEntry?.durationH}
        defaultQuality={editEntry?.quality}
      />
    </Portal>
  );
}
