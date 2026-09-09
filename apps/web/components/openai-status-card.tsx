'use client';

import { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle2 } from 'lucide-react';
import { getJson } from '../lib/api';

type OpenAiStatus = {
  configured: boolean;
  provider: 'openai' | 'unavailable';
  model: string | null;
};

export function OpenAiStatusCard() {
  const [status, setStatus] = useState<OpenAiStatus | null>(null);

  useEffect(() => {
    getJson<OpenAiStatus>('/chat/status')
      .then(setStatus)
      .catch(() => setStatus({ configured: false, provider: 'unavailable', model: null }));
  }, []);

  return (
    <div className="rounded-3xl bg-white shadow-card px-4 py-3.5 flex items-center gap-3">
      <img
        src="/logos/openai.png"
        alt="OpenAI"
        className={`h-9 w-9 object-contain flex-shrink-0 ${status?.configured ? '' : 'opacity-35'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink leading-snug">Agente RecoveryOS</p>
        <p className="text-[11px] text-ink/40 mt-0.5">
          {!status
            ? 'Comprobando configuración…'
            : status.configured
              ? `OpenAI activo${status.model ? ` · ${status.model}` : ''}`
              : 'Configura OPENAI_API_KEY para activar el agente'}
        </p>
      </div>
      <span
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold flex-shrink-0 ${
          status?.configured ? 'bg-moss/10 text-moss' : 'bg-sand/40 text-ink/45'
        }`}
      >
        {status?.configured ? <CheckCircle2 size={11} /> : <BrainCircuit size={11} />}
        {status?.configured ? 'Activo' : 'Sin configurar'}
      </span>
    </div>
  );
}
