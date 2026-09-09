'use client';

import { X, Link2 } from 'lucide-react';
import { Portal } from './portal';
import { StravaConnectCard } from './strava-connect-card';
import { CorosConnectCard } from './coros-connect-card';

export function ConexionesScreen({ onClose }: { onClose: () => void }) {
  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] bg-canvas flex flex-col animate-slide-up"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-ink/5 flex items-center justify-center">
              <Link2 size={16} className="text-ink/60" />
            </div>
            <h1 className="text-2xl font-bold text-ink">Conexiones</h1>
          </div>
          <button type="button" onClick={onClose}
            className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center">
            <X size={16} className="text-ink/60" />
          </button>
        </div>
        <p className="px-5 pb-5 text-sm text-ink/40 leading-relaxed">
          Enlaza tus apps de entrenamiento para traer actividad, sueño y recuperación a RecoveryOS automáticamente.
        </p>

        <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Salud y actividad
          </p>
          <StravaConnectCard />
          <CorosConnectCard />

          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1 pt-3">
            Inteligencia artificial
          </p>
          <div className="rounded-3xl bg-white shadow-card px-4 py-3.5 flex items-center gap-3 opacity-60">
            <img src="/logos/openai.png" alt="OpenAI" className="h-9 w-9 object-contain flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink leading-snug">OpenAI</p>
              <p className="text-[11px] text-ink/40 mt-0.5">Insights generados con IA real</p>
            </div>
            <span className="rounded-full bg-sand/40 px-2.5 py-1 text-[10px] font-semibold text-ink/40 flex-shrink-0">
              próximamente
            </span>
          </div>
        </div>
      </div>
    </Portal>
  );
}
