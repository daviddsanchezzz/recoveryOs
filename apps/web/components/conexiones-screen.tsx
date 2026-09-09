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
        <div className="flex items-center justify-between px-5 pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Link2 size={20} className="text-ink/60" />
            <h1 className="text-2xl font-bold text-ink">Conexiones</h1>
          </div>
          <button type="button" onClick={onClose}
            className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center">
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-3">
          <StravaConnectCard />
          <CorosConnectCard />
          <div className="rounded-4xl bg-white shadow-card overflow-hidden">
            <div className="px-5">
              {['OpenAI'].map((item) => (
                <div key={item} className="flex items-center justify-between py-3 border-b border-ink/5 last:border-0">
                  <span className="text-sm text-ink/60">{item}</span>
                  <span className="rounded-full bg-sand/30 px-2.5 py-0.5 text-[10px] font-medium text-ink/30">
                    próximamente
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
