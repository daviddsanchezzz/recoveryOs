'use client';

import { useEffect, useState } from 'react';
import { X, Activity } from 'lucide-react';
import { RecoveryService } from '../lib/services';
import { todayIso } from '../lib/date';
import { Portal } from './portal';
import type { Injury } from '../stores/recovery-store';

interface DolorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  injury: Injury | null;
  defaultDate?: string;
}

const PAIN_LABELS = ['Sin dolor', 'Muy leve', 'Leve', 'Leve-mod.', 'Moderado', 'Moderado', 'Moderado-int.', 'Intenso', 'Muy intenso', 'Severo', 'Máximo'];

export function DolorSheet({ isOpen, onClose, injury, defaultDate }: DolorSheetProps) {
  const [pain,     setPain]     = useState(0);
  const [didRehab, setDidRehab] = useState(false);
  const [notes,    setNotes]    = useState('');
  const [date,     setDate]     = useState(defaultDate ?? todayIso());
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPain(0);
      setDidRehab(false);
      setNotes('');
      setDate(defaultDate ?? todayIso());
      setSaved(false);
    }
  }, [isOpen, defaultDate]);

  function handleSave() {
    if (!injury) return;
    RecoveryService.logPain({ injuryId: injury.id, painLevel: pain, didRehab, notes: notes.trim() || undefined, date });
    setSaved(true);
    setTimeout(onClose, 600);
  }

  if (!isOpen || !injury) return null;

  const painColor =
    pain <= 2 ? 'text-moss' :
    pain <= 5 ? 'text-ember' :
    'text-red-500';

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-4xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-red-500" />
            <div>
              <h2 className="text-lg font-bold text-ink leading-tight">Registrar dolor</h2>
              <p className="text-xs text-ink/40 leading-none">{injury.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-canvas">
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        <div className="px-5 pt-2 pb-2 space-y-5">
          {/* Pain slider */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-ink/40">Nivel de dolor</span>
              <span className={`text-3xl font-bold ${painColor}`}>{pain}<span className="text-base font-normal text-ink/30">/10</span></span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={pain}
              onChange={(e) => setPain(Number(e.target.value))}
              className="w-full accent-ink"
            />
            <p className="text-center text-xs text-ink/40">{PAIN_LABELS[pain]}</p>
          </div>

          {/* Rehab toggle */}
          <button
            type="button"
            onClick={() => setDidRehab(!didRehab)}
            className={`w-full rounded-2xl px-4 py-3.5 flex items-center justify-between transition-all ${
              didRehab ? 'bg-moss text-white' : 'bg-canvas text-ink/60'
            }`}
          >
            <span className="text-sm font-semibold">Hice rehabilitación hoy</span>
            <span className="text-lg">{didRehab ? '✓' : '○'}</span>
          </button>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas opcionales..."
            rows={2}
            className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink placeholder:text-ink/25 outline-none resize-none"
          />

          {/* Date */}
          <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
            <span className="text-sm font-medium text-ink/50">Fecha</span>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm font-semibold text-ink bg-transparent outline-none text-right"
            />
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className="w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-30 transition-opacity"
          >
            {saved ? '¡Guardado! ✓' : 'Guardar'}
          </button>
        </div>
      </div>
    </Portal>
  );
}
