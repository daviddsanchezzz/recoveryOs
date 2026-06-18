'use client';

import { useState, useEffect } from 'react';
import { X, Zap, CheckCircle2 } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { RecoveryService } from '../lib/services';
import type { DailyHabits } from '../stores/recovery-store';
import { formatShortDate, todayIso } from '../lib/date';
import { Portal } from './portal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
};

function PainStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-10 w-10 rounded-xl bg-canvas flex items-center justify-center text-ink font-bold text-lg active:scale-95 transition-transform"
      >
        −
      </button>
      <div className="flex-1 text-center">
        <span className="text-3xl font-bold text-ink">{value}</span>
        <span className="text-base text-ink/40">/10</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(10, value + 1))}
        className="h-10 w-10 rounded-xl bg-canvas flex items-center justify-center text-ink font-bold text-lg active:scale-95 transition-transform"
      >
        +
      </button>
    </div>
  );
}

export function QuickCheckInSheet({ isOpen, onClose, date }: Props) {
  const injuries = useRecoveryStore((s) => s.injuries.filter((i) => i.status !== 'resolved'));
  const today = date ?? todayIso();

  // Form state
  const [painLevels, setPainLevels] = useState<Record<string, number>>({});
  const [rehabDone, setRehabDone] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // Init injury state when injuries change
  useEffect(() => {
    const levels: Record<string, number> = {};
    const rehab: Record<string, boolean> = {};
    injuries.forEach((i) => {
      levels[i.id] = 0;
      rehab[i.id] = false;
    });
    setPainLevels(levels);
    setRehabDone(rehab);
  }, [injuries]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setSaved(false);
      const levels: Record<string, number> = {};
      const rehab: Record<string, boolean> = {};
      injuries.forEach((i) => { levels[i.id] = 0; rehab[i.id] = false; });
      setPainLevels(levels);
      setRehabDone(rehab);
    }
  }, [isOpen]);

  function handleSave() {
    const anyRehabDone = Object.values(rehabDone).some(Boolean);

    const checkInHabits: DailyHabits = {
      rehab: anyRehabDone,
      mobility: false,
      stretching: false,
      goodNutrition: false,
      enoughProtein: false,
    };

    const injuryLogEntries = injuries.map((injury) => ({
      injuryId: injury.id,
      painLevel: painLevels[injury.id] ?? 0,
      didRehab: rehabDone[injury.id] ?? false,
    }));

    RecoveryService.saveCheckIn({
      date: today,
      activities: [],
      injuryLogs: injuryLogEntries,
      habits: checkInHabits,
    });

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  }

  if (!isOpen) return null;

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-4xl overflow-hidden animate-slide-up"
        style={{ maxHeight: '88vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-ink/10" />
        </div>

        <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(88vh - 20px)' }}>
          <div className="px-5 pb-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-xl font-bold text-ink">Registrar hoy</h2>
                <p className="text-sm text-ink/40 capitalize">{formatShortDate(today)}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-2xl bg-canvas flex items-center justify-center"
              >
                <X size={16} className="text-ink/60" />
              </button>
            </div>

            {/* Injuries */}
            {injuries.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-ember" />
                  <p className="text-sm font-semibold text-ink">Lesiones</p>
                </div>
                {injuries.map((injury) => (
                  <div key={injury.id} className="rounded-3xl bg-canvas p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">{injury.name}</p>
                        {injury.bodyPart && (
                          <p className="text-xs text-ink/40">{injury.bodyPart}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-ink/40">Dolor hoy</p>
                      <PainStepper
                        value={painLevels[injury.id] ?? 0}
                        onChange={(v) => setPainLevels((prev) => ({ ...prev, [injury.id]: v }))}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setRehabDone((prev) => ({ ...prev, [injury.id]: !prev[injury.id] }))
                      }
                      className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-all ${
                        rehabDone[injury.id]
                          ? 'bg-moss text-white'
                          : 'bg-white border border-ink/10 text-ink/60'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      {rehabDone[injury.id] ? 'Rehab completada ✓' : 'Marcar rehab como hecha'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              className={`w-full rounded-3xl py-4 text-base font-semibold transition-all ${
                saved
                  ? 'bg-moss text-white'
                  : 'bg-ink text-white active:scale-[0.98]'
              }`}
            >
              {saved ? '¡Guardado! ✓' : 'Guardar check-in'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
