'use client';

import { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle, RefreshCw, Trash2, ChevronRight } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { RecoveryService } from '../lib/services';
import { Portal } from './portal';
import { LesionSheet } from './lesion-sheet';
import { DolorSheet } from './dolor-sheet';
import type { Injury, InjuryStatus } from '../stores/recovery-store';

const STATUS_CONFIG: Record<InjuryStatus, { label: string; color: string; Icon: React.ElementType }> = {
  active:     { label: 'Activa',      color: 'text-red-500 bg-red-50',     Icon: AlertCircle  },
  recovering: { label: 'Recuperando', color: 'text-ember bg-orange-50',    Icon: RefreshCw    },
  resolved:   { label: 'Resuelta',    color: 'text-moss bg-green-50',      Icon: CheckCircle  },
};

function relDate(iso: string): string {
  const today = new Date();
  const d = new Date(iso + 'T12:00:00');
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 30) return `Hace ${diffDays} días`;
  const months = Math.floor(diffDays / 30);
  return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
}

export function LesionesScreen({ onClose }: { onClose: () => void }) {
  const { injuries, injuryLogs } = useRecoveryStore();
  const [showAddSheet,   setShowAddSheet]   = useState(false);
  const [editInjury,     setEditInjury]     = useState<Injury | null>(null);
  const [dolorInjury,    setDolorInjury]    = useState<Injury | null>(null);
  const [expandedId,     setExpandedId]     = useState<string | null>(null);

  const active     = injuries.filter((i) => i.status === 'active');
  const recovering = injuries.filter((i) => i.status === 'recovering');
  const resolved   = injuries.filter((i) => i.status === 'resolved');

  function handleDelete(id: string) {
    RecoveryService.deleteInjury(id);
    if (expandedId === id) setExpandedId(null);
  }

  function lastLog(injuryId: string) {
    return injuryLogs.filter((l) => l.injuryId === injuryId).sort((a, b) => b.date.localeCompare(a.date))[0];
  }

  function InjuryGroup({ title, items }: { title: string; items: Injury[] }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">{title}</p>
        {items.map((injury) => {
          const { label, color, Icon } = STATUS_CONFIG[injury.status];
          const expanded = expandedId === injury.id;
          const last = lastLog(injury.id);

          return (
            <div key={injury.id} className="rounded-4xl bg-white shadow-card overflow-hidden">
              {/* Card header */}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : injury.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-ink">{injury.name}</p>
                    {injury.bodyPart && (
                      <span className="text-xs text-ink/40 bg-canvas rounded-full px-2 py-0.5">{injury.bodyPart}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${color}`}>
                      <Icon size={10} />
                      {label}
                    </span>
                    <span className="text-xs text-ink/35">desde {relDate(injury.startDate)}</span>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={`text-ink/25 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </button>

              {/* Expanded actions */}
              {expanded && (
                <div className="border-t border-ink/6 px-5 pb-4 pt-3 space-y-2">
                  {last && (
                    <p className="text-xs text-ink/40 pb-1">
                      Último registro: dolor {last.painLevel}/10 · {relDate(last.date)}
                      {last.didRehab ? ' · Rehab ✓' : ''}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setDolorInjury(injury); setExpandedId(null); }}
                      className="flex-1 rounded-2xl bg-ink text-white py-2.5 text-xs font-semibold"
                    >
                      Registrar dolor
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditInjury(injury); setExpandedId(null); }}
                      className="flex-1 rounded-2xl bg-canvas text-ink/70 py-2.5 text-xs font-semibold"
                    >
                      Cambiar estado
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(injury.id)}
                      className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
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
            <AlertCircle size={20} className="text-ember" />
            <h1 className="text-2xl font-bold text-ink">Lesiones</h1>
          </div>
          <button type="button" onClick={onClose}
            className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center">
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-5">
          {injuries.length === 0 && (
            <div className="rounded-4xl bg-canvas-light border border-sand/40 p-8 flex flex-col items-center gap-2 text-center">
              <AlertCircle size={24} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin lesiones registradas</p>
              <p className="text-xs text-ink/25">Pulsa + para añadir la primera</p>
            </div>
          )}

          <InjuryGroup title="Activas" items={active} />
          <InjuryGroup title="En recuperación" items={recovering} />
          <InjuryGroup title="Resueltas" items={resolved} />
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-5 z-[71]">
        <button type="button" onClick={() => setShowAddSheet(true)}
          className="h-14 w-14 rounded-full bg-ink shadow-card-lg flex items-center justify-center active:scale-95 transition-transform">
          <Plus size={22} className="text-white" />
        </button>
      </div>

      <LesionSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
      />

      <LesionSheet
        isOpen={editInjury !== null}
        onClose={() => setEditInjury(null)}
        editId={editInjury?.id}
        defaultName={editInjury?.name}
        defaultBodyPart={editInjury?.bodyPart}
        defaultStartDate={editInjury?.startDate}
        defaultStatus={editInjury?.status}
      />

      <DolorSheet
        isOpen={dolorInjury !== null}
        onClose={() => setDolorInjury(null)}
        injury={dolorInjury}
      />
    </Portal>
  );
}
