'use client';

import { useEffect, useState } from 'react';
import { Flame, Footprints, X } from 'lucide-react';
import { todayIso } from '../lib/date';
import { RecoveryService } from '../lib/services';
import { Portal } from './portal';

interface MovementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultSteps?: number;
  defaultActiveCalories?: number;
  editId?: string;
}

export function MovementSheet({
  isOpen,
  onClose,
  defaultDate,
  defaultSteps,
  defaultActiveCalories,
  editId,
}: MovementSheetProps) {
  const [date, setDate] = useState(defaultDate ?? todayIso());
  const [steps, setSteps] = useState(defaultSteps !== undefined ? String(defaultSteps) : '');
  const [activeCalories, setActiveCalories] = useState(
    defaultActiveCalories !== undefined ? String(defaultActiveCalories) : '',
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDate(defaultDate ?? todayIso());
    setSteps(defaultSteps !== undefined ? String(defaultSteps) : '');
    setActiveCalories(defaultActiveCalories !== undefined ? String(defaultActiveCalories) : '');
    setSaved(false);
  }, [isOpen, defaultDate, defaultSteps, defaultActiveCalories]);

  function handleSave() {
    const parsedSteps = Number.parseInt(steps || '0', 10);
    const parsedActiveCalories = Number.parseInt(activeCalories || '0', 10);

    if (
      Number.isNaN(parsedSteps) ||
      Number.isNaN(parsedActiveCalories) ||
      parsedSteps < 0 ||
      parsedActiveCalories < 0
    ) {
      return;
    }

    if (editId) {
      RecoveryService.updateHealthMetric(editId, {
        date,
        steps: parsedSteps,
        activeCalories: parsedActiveCalories,
      });
    } else {
      RecoveryService.logHealthMetric({
        date,
        steps: parsedSteps,
        activeCalories: parsedActiveCalories,
      });
    }

    setSaved(true);
    setTimeout(onClose, 600);
  }

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-4xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-lg font-bold text-ink">Editar movimiento</p>
            <p className="text-xs text-ink/40 mt-0.5">Pasos y kcal activas del día</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-canvas"
          >
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        <div className="px-5 pt-2 pb-2 space-y-4">
          <div className="rounded-3xl bg-canvas p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Footprints size={16} className="text-moss" />
              <span className="text-sm font-semibold text-ink">Pasos</span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
              placeholder="0"
              autoFocus
              className="w-full bg-white rounded-2xl px-4 py-3 text-lg font-semibold text-ink outline-none placeholder:text-ink/20"
            />
          </div>

          <div className="rounded-3xl bg-canvas p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-ember" />
              <span className="text-sm font-semibold text-ink">Kcal activas</span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={activeCalories}
              onChange={(event) => setActiveCalories(event.target.value)}
              placeholder="0"
              className="w-full bg-white rounded-2xl px-4 py-3 text-lg font-semibold text-ink outline-none placeholder:text-ink/20"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
            <span className="text-sm font-medium text-ink/50">Fecha</span>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(event) => setDate(event.target.value)}
              className="text-sm font-semibold text-ink bg-transparent outline-none text-right"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className="w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-30 transition-opacity"
          >
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>
    </Portal>
  );
}
