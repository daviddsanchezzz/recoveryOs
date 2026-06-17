'use client';

import { useState, useEffect } from 'react';
import { X, Scale, Zap, CheckCircle2, Bike, ChevronDown, ChevronUp } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { RecoveryService } from '../lib/services';
import type { ActivityType, DailyHabits } from '../stores/recovery-store';
import { formatShortDate, todayIso } from '../lib/date';

const ACTIVITY_OPTS: { type: ActivityType; label: string; emoji: string }[] = [
  { type: 'gym',      label: 'Gym',     emoji: '🏋️' },
  { type: 'bike',     label: 'Bici',    emoji: '🚴' },
  { type: 'walk',     label: 'Caminar', emoji: '🚶' },
  { type: 'run',      label: 'Correr',  emoji: '🏃' },
  { type: 'swim',     label: 'Nadar',   emoji: '🏊' },
  { type: 'mobility', label: 'Movilidad', emoji: '🧘' },
  { type: 'rehab',    label: 'Rehab',   emoji: '💪' },
  { type: 'other',    label: 'Otro',    emoji: '⚡' },
];

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
  const [weightInput, setWeightInput] = useState('');
  const [painLevels, setPainLevels] = useState<Record<string, number>>({});
  const [rehabDone, setRehabDone] = useState<Record<string, boolean>>({});
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [activityDuration, setActivityDuration] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [showActivityDuration, setShowActivityDuration] = useState(false);
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
      setWeightInput('');
      setSelectedActivity(null);
      setActivityDuration('');
      setActivityNotes('');
      setShowActivityDuration(false);
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

    const activityEntries = selectedActivity
      ? [{
          type: selectedActivity,
          durationMinutes: activityDuration ? parseInt(activityDuration) : undefined,
          notes: activityNotes || undefined,
        }]
      : [];

    const injuryLogEntries = injuries.map((injury) => ({
      injuryId: injury.id,
      painLevel: painLevels[injury.id] ?? 0,
      didRehab: rehabDone[injury.id] ?? false,
    }));

    RecoveryService.saveCheckIn({
      date: today,
      weightKg: weightInput ? parseFloat(weightInput.replace(',', '.')) : undefined,
      activities: activityEntries,
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
    <>
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

            {/* Weight */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Scale size={15} className="text-moss" />
                <p className="text-sm font-semibold text-ink">Peso</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="78.2"
                  className="flex-1 rounded-2xl bg-canvas border border-ink/8 px-4 py-3.5 text-2xl font-semibold text-ink placeholder:text-ink/20 outline-none text-center"
                />
                <span className="text-base font-medium text-ink/40 w-8">kg</span>
              </div>
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

            {/* Activity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bike size={15} className="text-moss" />
                <p className="text-sm font-semibold text-ink">Actividad</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ACTIVITY_OPTS.map(({ type, label, emoji }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedActivity(selectedActivity === type ? null : type);
                      setShowActivityDuration(selectedActivity !== type);
                    }}
                    className={`flex flex-col items-center gap-1 rounded-2xl py-3 px-1 text-center transition-all ${
                      selectedActivity === type
                        ? 'bg-ink text-white'
                        : 'bg-canvas text-ink'
                    }`}
                  >
                    <span className="text-lg">{emoji}</span>
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </button>
                ))}
              </div>

              {selectedActivity && showActivityDuration && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={activityDuration}
                        onChange={(e) => setActivityDuration(e.target.value)}
                        placeholder="45"
                        className="w-full rounded-2xl bg-canvas border border-ink/8 px-4 py-3 text-sm outline-none pr-14"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink/40">min</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowActivityDuration(false)}
                      className="h-11 w-11 rounded-2xl bg-canvas flex items-center justify-center flex-shrink-0"
                    >
                      <ChevronUp size={16} className="text-ink/40" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={activityNotes}
                    onChange={(e) => setActivityNotes(e.target.value)}
                    placeholder="Nota opcional..."
                    className="w-full rounded-2xl bg-canvas border border-ink/8 px-4 py-3 text-sm outline-none"
                  />
                </div>
              )}

              {selectedActivity && !showActivityDuration && (
                <button
                  type="button"
                  onClick={() => setShowActivityDuration(true)}
                  className="flex items-center gap-1.5 text-xs text-ink/40 px-1"
                >
                  <ChevronDown size={12} />
                  Añadir duración y nota
                </button>
              )}
            </div>

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
    </>
  );
}
