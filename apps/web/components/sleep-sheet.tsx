'use client';

import { useEffect, useState } from 'react';
import { X, Moon } from 'lucide-react';
import { RecoveryService } from '../lib/services';
import { todayIso } from '../lib/date';
import { sleepScoreLabel } from '../lib/sleep';
import { Portal } from './portal';

function toHoursMinutes(durationH: number): { h: string; m: string } {
  const totalMin = Math.round(durationH * 60);
  return { h: String(Math.floor(totalMin / 60)), m: String(totalMin % 60) };
}

interface SleepSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultDurationH?: number;
  defaultQuality?: 1 | 2 | 3 | 4 | 5;
  defaultScore?: number | null;
  editId?: string;
}

export function SleepSheet({
  isOpen, onClose,
  defaultDate, defaultDurationH, defaultQuality = 3, defaultScore, editId,
}: SleepSheetProps) {
  const init = defaultDurationH !== undefined ? toHoursMinutes(defaultDurationH) : { h: '', m: '' };
  const [h,       setH]       = useState(init.h);
  const [m,       setM]       = useState(init.m);
  const [score,   setScore]   = useState(defaultScore ?? defaultQuality * 20);
  const [date,    setDate]    = useState(defaultDate ?? todayIso());
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    if (isOpen) {
      const parsed = defaultDurationH !== undefined ? toHoursMinutes(defaultDurationH) : { h: '', m: '' };
      setH(parsed.h);
      setM(parsed.m);
      setScore(defaultScore ?? defaultQuality * 20);
      setDate(defaultDate ?? todayIso());
      setSaved(false);
    }
  }, [isOpen, defaultDate, defaultDurationH, defaultQuality, defaultScore]);

  const totalH   = (parseInt(h || '0') * 60 + parseInt(m || '0')) / 60;
  const isValid  = totalH > 0;

  function handleSave() {
    if (!isValid) return;
    const quality = Math.max(1, Math.ceil(score / 20)) as 1 | 2 | 3 | 4 | 5;
    if (editId) {
      RecoveryService.updateSleep(editId, { durationH: totalH, quality, score, date });
    } else {
      RecoveryService.logSleep({ durationH: totalH, quality, score, date });
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
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-sand" />
            <h2 className="text-lg font-bold text-ink">{editId ? 'Editar sueño' : 'Registrar sueño'}</h2>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-canvas">
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        <div className="px-5 pt-2 pb-2 space-y-5">
          {/* Hours + minutes */}
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={23}
              value={h}
              onChange={(e) => setH(e.target.value)}
              placeholder="0"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="text-6xl font-bold text-ink text-center w-24 bg-transparent outline-none placeholder:text-ink/15"
            />
            <span className="text-3xl font-bold text-ink/30 pb-1">h</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={m}
              onChange={(e) => setM(e.target.value)}
              placeholder="00"
              className="text-6xl font-bold text-ink text-center w-28 bg-transparent outline-none placeholder:text-ink/15"
            />
            <span className="text-3xl font-bold text-ink/30 pb-1">min</span>
          </div>

          {/* Score */}
          <div className="rounded-2xl bg-canvas px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Puntuación</p>
                <p className="text-xs text-ink/35 mt-0.5">{sleepScoreLabel(score)}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-16 bg-white rounded-xl border border-ink/8 px-2 py-2 text-xl font-bold text-ink text-center outline-none"
                />
                <span className="text-xs font-semibold text-ink/35">/100</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-ink"
              aria-label="Puntuación del sueño"
            />
          </div>

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
            disabled={!isValid || saved}
            className="w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-30 transition-opacity"
          >
            {saved ? '¡Guardado! ✓' : 'Guardar'}
          </button>
        </div>
      </div>
    </Portal>
  );
}
