'use client';

import { useEffect, useState } from 'react';
import { X, Scale } from 'lucide-react';
import { RecoveryService } from '../lib/services';
import { todayIso } from '../lib/date';
import { Portal } from './portal';

interface WeightSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
  defaultKg?: number;
  editId?: string;
}

export function WeightSheet({ isOpen, onClose, defaultDate, defaultKg, editId }: WeightSheetProps) {
  const [kg, setKg] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKg(defaultKg !== undefined ? String(defaultKg) : '');
      setDate(defaultDate);
      setSaved(false);
    }
  }, [isOpen, defaultDate, defaultKg]);

  function handleSave() {
    const value = parseFloat(kg.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;
    if (editId) RecoveryService.deleteWeight(editId, true);
    RecoveryService.logWeight(value, date);
    setSaved(true);
    setTimeout(onClose, 700);
  }

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-4xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-moss" />
            <h2 className="text-lg font-bold text-ink">{defaultKg !== undefined ? 'Editar peso' : 'Registrar peso'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-canvas"
          >
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 space-y-5">
          {/* Big weight input */}
          <div className="flex items-baseline justify-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              placeholder="0.0"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="text-6xl font-bold text-ink text-center w-44 bg-transparent outline-none placeholder:text-ink/15"
            />
            <span className="text-2xl font-medium text-ink/40">kg</span>
          </div>

          {/* Date row */}
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
            disabled={!kg.trim() || saved}
            className="w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-30 transition-opacity"
          >
            {saved ? '¡Guardado! ✓' : 'Guardar'}
          </button>
        </div>
      </div>
    </Portal>
  );
}
