'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { RecoveryService } from '../lib/services';
import { todayIso } from '../lib/date';
import { Portal } from './portal';
import type { InjuryStatus } from '../stores/recovery-store';

const BODY_PARTS = ['Rodilla', 'Tobillo', 'Espalda', 'Hombro', 'Cadera', 'Cuello', 'Muñeca', 'Codo', 'Otro'];
const STATUS_OPTIONS: { value: InjuryStatus; label: string }[] = [
  { value: 'active',     label: 'Activa'      },
  { value: 'recovering', label: 'Recuperando' },
  { value: 'resolved',   label: 'Resuelta'    },
];

interface LesionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultBodyPart?: string;
  defaultStartDate?: string;
  defaultStatus?: InjuryStatus;
  editId?: string;
}

export function LesionSheet({
  isOpen, onClose,
  defaultName = '', defaultBodyPart = '', defaultStartDate, defaultStatus = 'active',
  editId,
}: LesionSheetProps) {
  const [name,      setName]      = useState(defaultName);
  const [bodyPart,  setBodyPart]  = useState(defaultBodyPart);
  const [startDate, setStartDate] = useState(defaultStartDate ?? todayIso());
  const [status,    setStatus]    = useState<InjuryStatus>(defaultStatus);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setBodyPart(defaultBodyPart);
      setStartDate(defaultStartDate ?? todayIso());
      setStatus(defaultStatus);
      setSaved(false);
    }
  }, [isOpen, defaultName, defaultBodyPart, defaultStartDate, defaultStatus]);

  function handleSave() {
    if (!name.trim()) return;
    if (editId) {
      RecoveryService.updateInjuryStatus(editId, status);
    } else {
      RecoveryService.createInjury({ name: name.trim(), bodyPart: bodyPart || undefined, startDate, status });
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
            <AlertCircle size={18} className="text-ember" />
            <h2 className="text-lg font-bold text-ink">{editId ? 'Editar lesión' : 'Nueva lesión'}</h2>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-canvas">
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        <div className="px-5 pt-2 pb-2 space-y-4">
          {/* Name */}
          {!editId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/40">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Tendinitis rotuliana"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm font-medium text-ink placeholder:text-ink/25 outline-none"
              />
            </div>
          )}

          {/* Body part chips */}
          {!editId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/40">Zona</label>
              <div className="flex flex-wrap gap-2">
                {BODY_PARTS.map((part) => (
                  <button
                    key={part}
                    type="button"
                    onClick={() => setBodyPart(bodyPart === part ? '' : part)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                      bodyPart === part ? 'bg-ink text-white' : 'bg-canvas text-ink/60'
                    }`}
                  >
                    {part}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start date */}
          {!editId && (
            <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
              <span className="text-sm font-medium text-ink/50">Fecha inicio</span>
              <input
                type="date"
                value={startDate}
                max={todayIso()}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm font-semibold text-ink bg-transparent outline-none text-right"
              />
            </div>
          )}

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-ink/40">Estado</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                    status === opt.value
                      ? opt.value === 'active' ? 'bg-red-500 text-white'
                        : opt.value === 'recovering' ? 'bg-ember text-white'
                        : 'bg-moss text-white'
                      : 'bg-canvas text-ink/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!editId && !name.trim() || saved}
            className="w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-30 transition-opacity"
          >
            {saved ? '¡Guardado! ✓' : 'Guardar'}
          </button>
        </div>
      </div>
    </Portal>
  );
}
