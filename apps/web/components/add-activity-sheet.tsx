'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { RecoveryService } from '../lib/services';
import { todayIso } from '../lib/date';
import { Portal } from './portal';
import type { ActivityType } from '../stores/recovery-store';

const ACTIVITY_OPTS: { type: ActivityType; label: string; emoji: string }[] = [
  { type: 'gym',      label: 'Gym',       emoji: '🏋️' },
  { type: 'bike',     label: 'Bici',      emoji: '🚴' },
  { type: 'walk',     label: 'Caminar',   emoji: '🚶' },
  { type: 'run',      label: 'Correr',    emoji: '🏃' },
  { type: 'swim',     label: 'Nadar',     emoji: '🏊' },
  { type: 'mobility', label: 'Movilidad', emoji: '🧘' },
  { type: 'rehab',    label: 'Rehab',     emoji: '💪' },
  { type: 'other',    label: 'Otro',      emoji: '⚡' },
];

export function AddActivitySheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [type,          setType]         = useState<ActivityType | null>(null);
  const [duration,      setDuration]     = useState('');
  const [notes,         setNotes]        = useState('');
  const [date,          setDate]         = useState(todayIso);
  const [showDetails,   setShowDetails]  = useState(false);
  const [saved,         setSaved]        = useState(false);

  function reset() {
    setType(null);
    setDuration('');
    setNotes('');
    setDate(todayIso());
    setShowDetails(false);
    setSaved(false);
  }

  function handleSave() {
    if (!type) return;
    RecoveryService.logActivity({
      type,
      durationMinutes: duration ? parseInt(duration, 10) : undefined,
      notes: notes.trim() || undefined,
      date,
    });
    setSaved(true);
    setTimeout(() => {
      reset();
      onClose();
    }, 800);
  }

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[60] bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] animate-slide-up"
      >
        <div
          className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-y-auto"
          style={{ maxHeight: '88vh' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="px-5 pb-8 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pt-2">
              <h2 className="text-xl font-bold text-ink">Nueva actividad</h2>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-2xl bg-canvas-light flex items-center justify-center"
              >
                <X size={16} className="text-ink/60" />
              </button>
            </div>

            {/* Type grid */}
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITY_OPTS.map(({ type: t, label, emoji }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(type === t ? null : t);
                    setShowDetails(type !== t);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-3 px-1 text-center transition-all ${
                    type === t ? 'bg-ink text-white' : 'bg-canvas-light text-ink'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </button>
              ))}
            </div>

            {/* Details (duration + notes) */}
            {type && (
              <div className="space-y-2 animate-fade-in">
                {showDetails ? (
                  <>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="45"
                          className="w-full rounded-2xl bg-canvas-light border border-ink/8 px-4 py-3 text-sm outline-none pr-14"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink/40">min</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDetails(false)}
                        className="h-11 w-11 rounded-2xl bg-canvas-light flex items-center justify-center flex-shrink-0"
                      >
                        <ChevronUp size={16} className="text-ink/40" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Nota opcional..."
                      className="w-full rounded-2xl bg-canvas-light border border-ink/8 px-4 py-3 text-sm outline-none"
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="flex items-center gap-1.5 text-xs text-ink/40 px-1"
                  >
                    <ChevronDown size={12} />
                    Añadir duración y nota
                  </button>
                )}
              </div>
            )}

            {/* Date */}
            {type && (
              <div className="flex items-center justify-between rounded-2xl bg-canvas-light px-4 py-3 animate-fade-in">
                <span className="text-sm font-medium text-ink/50">Fecha</span>
                <input
                  type="date"
                  value={date}
                  max={todayIso()}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-sm font-semibold text-ink bg-transparent outline-none text-right"
                />
              </div>
            )}

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!type || saved}
              className={`w-full rounded-3xl py-4 text-base font-semibold transition-all ${
                saved
                  ? 'bg-moss text-white'
                  : 'bg-ink text-white active:scale-[0.98] disabled:opacity-30'
              }`}
            >
              {saved ? '¡Guardado! ✓' : 'Guardar actividad'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
