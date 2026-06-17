'use client';

import { FormEvent, useState } from 'react';
import { todayIso } from '../lib/date';
import { useChatStore } from '../stores/chat-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import { Panel } from './ui/card';

const quickActions = [
  'peso 70.2',
  'dolor 2',
  'rehab hecha',
  '30 min bici',
] as const;

export function ChatPanel({ compact = true }: { compact?: boolean }) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { messages, addMessage } = useChatStore();
  const user = useSessionStore((state) => state.user);
  const injuries = useRecoveryStore((state) => state.injuries.filter((injury) => injury.status !== 'resolved'));
  const saveWeight = useRecoveryStore((state) => state.saveWeight);
  const addActivity = useRecoveryStore((state) => state.addActivity);
  const logInjuryPain = useRecoveryStore((state) => state.logInjuryPain);
  const saveDailyCheckIn = useRecoveryStore((state) => state.saveDailyCheckIn);

  function buildReply(message: string) {
    const normalized = message.toLowerCase().trim();
    const today = todayIso();
    const firstInjury = injuries[0];

    const weightMatch = normalized.match(/peso\s+(\d{2,3}(?:[.,]\d+)?)/);
    if (weightMatch) {
      const weight = Number(weightMatch[1].replace(',', '.'));
      saveWeight(weight, today);
      return `Peso guardado: ${weight.toFixed(1)} kg.`;
    }

    const painMatch = normalized.match(/dolor\s+(\d{1,2})/);
    if (painMatch && firstInjury) {
      const painLevel = Math.min(10, Number(painMatch[1]));
      logInjuryPain({
        injuryId: firstInjury.id,
        date: today,
        painLevel,
        didRehab: false,
      });
      return `Dolor ${painLevel}/10 registrado para ${firstInjury.name}.`;
    }

    if (normalized.includes('rehab hecha') && firstInjury) {
      logInjuryPain({
        injuryId: firstInjury.id,
        date: today,
        painLevel: 0,
        didRehab: true,
      });
      saveDailyCheckIn({
        date: today,
        activities: [],
        injuryLogs: [
          {
            injuryId: firstInjury.id,
            painLevel: 0,
            didRehab: true,
          },
        ],
        habits: {
          rehab: true,
          mobility: false,
          stretching: false,
          goodNutrition: false,
          enoughProtein: false,
        },
      });
      return 'He marcado la rehab como completada para hoy.';
    }

    const activityMatch = normalized.match(/(\d+)\s*min\s*(gym|bici|bike|walk|caminado|swim|run|mobility|rehab)/);
    if (activityMatch) {
      const durationMinutes = Number(activityMatch[1]);
      const rawType = activityMatch[2];
      const type =
        rawType === 'bici' || rawType === 'bike'
          ? 'bike'
          : rawType === 'caminado'
            ? 'walk'
            : rawType;
      addActivity({
        date: today,
        type: type as 'gym' | 'bike' | 'walk' | 'swim' | 'run' | 'mobility' | 'rehab' | 'other',
        durationMinutes,
        notes: undefined,
      });
      return `Actividad guardada: ${durationMinutes} min de ${type}.`;
    }

    if (normalized.startsWith('gym ')) {
      addActivity({
        date: today,
        type: 'gym',
        durationMinutes: 45,
        notes: message.slice(4),
      });
      return 'Sesion de gym registrada con nota.';
    }

    return 'Puedo registrar peso, dolor, rehab y actividades rapidas desde este chat.';
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSubmitting || !user) {
      return;
    }

    addMessage({ role: 'user', content: message });
    setInput('');
    setIsSubmitting(true);

    const reply = buildReply(message);
    addMessage({ role: 'assistant', content: reply });
    setIsSubmitting(false);
  }

  function applyQuickAction(action: string) {
    setInput(action);
  }

  return (
    <Panel className={`flex h-full flex-col ${compact ? '' : 'min-h-[65vh] rounded-[32px]'}`}>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Chat V1</p>
        <h2 className="mt-2 text-2xl font-semibold">Entrada rapida sin friccion</h2>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => applyQuickAction(action)}
            className="rounded-full bg-canvas px-3 py-2 text-xs text-ink"
          >
            {action}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-3 overflow-auto">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[90%] rounded-3xl px-4 py-3 text-sm ${
              message.role === 'user'
                ? 'ml-auto bg-ink text-white'
                : 'bg-canvas text-ink'
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-6 flex gap-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={!user}
          placeholder='Ej: "peso 70.2" o "30 min bici"'
          className="flex-1 rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting || !user}
          className="rounded-full bg-ember px-5 py-3 text-sm font-medium text-white"
        >
          {isSubmitting ? 'Guardando...' : 'Enviar'}
        </button>
      </form>
      {!user ? <p className="mt-3 text-sm text-ink/60">Necesitas iniciar sesion para usar el chat.</p> : null}
      <p className="mt-3 text-sm text-ink/60">
        Sin IA todavia: usa reglas simples y chips rapidos para registrar datos.
      </p>
    </Panel>
  );
}
