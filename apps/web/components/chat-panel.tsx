'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send, Scale, Zap, CheckCircle, Bike } from 'lucide-react';
import { todayIso } from '../lib/date';
import { useChatStore } from '../stores/chat-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';

const quickActions = [
  { label: 'Peso', example: 'peso 70.2', icon: Scale },
  { label: 'Dolor', example: 'dolor 2', icon: Zap },
  { label: 'Rehab', example: 'rehab hecha', icon: CheckCircle },
  { label: 'Bici', example: '30 min bici', icon: Bike },
] as const;

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, addMessage } = useChatStore();
  const user = useSessionStore((state) => state.user);
  const injuries = useRecoveryStore((state) => state.injuries.filter((i) => i.status !== 'resolved'));
  const saveWeight = useRecoveryStore((state) => state.saveWeight);
  const addActivity = useRecoveryStore((state) => state.addActivity);
  const logInjuryPain = useRecoveryStore((state) => state.logInjuryPain);
  const saveDailyCheckIn = useRecoveryStore((state) => state.saveDailyCheckIn);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function buildReply(message: string): string {
    const normalized = message.toLowerCase().trim();
    const today = todayIso();
    const firstInjury = injuries[0];

    const weightMatch = normalized.match(/peso\s+(\d{2,3}(?:[.,]\d+)?)/);
    if (weightMatch) {
      const weight = Number(weightMatch[1].replace(',', '.'));
      saveWeight(weight, today);
      return `Peso guardado: ${weight.toFixed(1)} kg ✓`;
    }

    const painMatch = normalized.match(/dolor\s+(\d{1,2})/);
    if (painMatch && firstInjury) {
      const painLevel = Math.min(10, Number(painMatch[1]));
      logInjuryPain({ injuryId: firstInjury.id, date: today, painLevel, didRehab: false });
      return `Dolor ${painLevel}/10 registrado para ${firstInjury.name} ✓`;
    }

    if (normalized.includes('rehab hecha') && firstInjury) {
      logInjuryPain({ injuryId: firstInjury.id, date: today, painLevel: 0, didRehab: true });
      saveDailyCheckIn({
        date: today,
        activities: [],
        injuryLogs: [{ injuryId: firstInjury.id, painLevel: 0, didRehab: true }],
        habits: { rehab: true, mobility: false, stretching: false, goodNutrition: false, enoughProtein: false },
      });
      return 'Rehab marcada como completada para hoy ✓';
    }

    const activityMatch = normalized.match(/(\d+)\s*min\s*(gym|bici|bike|walk|caminado|swim|run|mobility|rehab)/);
    if (activityMatch) {
      const durationMinutes = Number(activityMatch[1]);
      const rawType = activityMatch[2];
      const type = rawType === 'bici' || rawType === 'bike' ? 'bike' : rawType === 'caminado' ? 'walk' : rawType;
      addActivity({
        date: today,
        type: type as 'gym' | 'bike' | 'walk' | 'swim' | 'run' | 'mobility' | 'rehab' | 'other',
        durationMinutes,
        notes: undefined,
      });
      return `Actividad guardada: ${durationMinutes} min de ${type} ✓`;
    }

    if (normalized.startsWith('gym ')) {
      addActivity({ date: today, type: 'gym', durationMinutes: 45, notes: message.slice(4) });
      return 'Sesión de gym registrada ✓';
    }

    return 'Puedo registrar peso, dolor, rehab y actividades. Prueba: "peso 70.2", "dolor 3", "30 min bici".';
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSubmitting || !user) return;

    addMessage({ role: 'user', content: message });
    setInput('');
    setIsSubmitting(true);

    await new Promise((r) => setTimeout(r, 300));
    const reply = buildReply(message);
    addMessage({ role: 'assistant', content: reply });
    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh]">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-canvas">
        <h1 className="text-2xl font-bold text-ink">Chat</h1>
        <p className="text-sm text-ink/40 mt-0.5">Registra en lenguaje natural</p>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-3 bg-canvas">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {quickActions.map(({ label, example, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setInput(example)}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-white border border-ink/8 px-3.5 py-2 shadow-card"
            >
              <Icon size={13} className="text-moss" />
              <span className="text-xs font-medium text-ink">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 scroll-smooth-ios no-scrollbar pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-center">
            <p className="text-sm text-ink/30">Escribe algo para empezar</p>
            <p className="text-xs text-ink/20">Ej: "peso 70.2" o "30 min bici"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-ink text-white rounded-br-lg'
                  : 'bg-white text-ink shadow-card rounded-bl-lg'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isSubmitting && (
          <div className="flex justify-start">
            <div className="bg-white shadow-card rounded-3xl rounded-bl-lg px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="h-2 w-2 rounded-full bg-ink/20 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-ink/20 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-ink/20 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 bg-canvas border-t border-ink/6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!user}
            placeholder='Escribe algo...'
            className="flex-1 rounded-2xl bg-white border border-ink/8 px-4 py-3 text-sm text-ink placeholder:text-ink/30 outline-none shadow-card"
          />
          <button
            type="submit"
            disabled={isSubmitting || !input.trim() || !user}
            className="h-11 w-11 flex-shrink-0 rounded-2xl bg-ink flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <Send size={16} className="text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
