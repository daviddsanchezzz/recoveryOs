'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send, Scale, Zap, CheckCircle, Bike, Dumbbell, Footprints } from 'lucide-react';
import { todayIso } from '../lib/date';
import { RecoveryService } from '../lib/services';
import { useChatStore } from '../stores/chat-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import type { ActivityType } from '../stores/recovery-store';

// ─── NLP Parser ──────────────────────────────────────────────────────────────

function parseMessage(
  message: string,
  firstInjuryId: string | null,
  firstInjuryName: string | null,
): { action: () => void; reply: string } | null {
  const raw = message.trim();
  const txt = raw.toLowerCase();
  const today = todayIso();

  // peso X.X
  const weightMatch = txt.match(/peso\s+(\d{1,3}(?:[.,]\d+)?)/);
  if (weightMatch) {
    const kg = parseFloat(weightMatch[1].replace(',', '.'));
    return {
      action: () => RecoveryService.logWeight(kg, today),
      reply: `Peso guardado: ${kg.toFixed(1)} kg ✓`,
    };
  }

  // "he pesado X" / "pesé X"
  const weightMatch2 = txt.match(/(?:he?\s+pes[aoe]d?o?|pesé)\s+(\d{1,3}(?:[.,]\d+)?)/);
  if (weightMatch2) {
    const kg = parseFloat(weightMatch2[1].replace(',', '.'));
    return {
      action: () => RecoveryService.logWeight(kg, today),
      reply: `Peso guardado: ${kg.toFixed(1)} kg ✓`,
    };
  }

  // dolor X / me duele X / duele X
  const painMatch = txt.match(/(?:dolor|me\s+duele?|duele?)\s+(\d{1,2})/);
  if (painMatch && firstInjuryId) {
    const level = Math.min(10, parseInt(painMatch[1]));
    return {
      action: () =>
        RecoveryService.logPain({ injuryId: firstInjuryId, painLevel: level, didRehab: false }),
      reply: `Dolor ${level}/10 registrado para ${firstInjuryName ?? 'lesión'} ✓`,
    };
  }

  // rehab hecha / he hecho la rehab / rehab ok / hice rehab
  const rehabMatch = txt.match(/(?:rehab\s*(?:hecha|ok|done|listo|bien)|he?\s+hecho?\s+(?:la\s+)?rehab|hice\s+(?:la\s+)?rehab)/);
  if (rehabMatch && firstInjuryId) {
    return {
      action: () => {
        RecoveryService.logPain({ injuryId: firstInjuryId, painLevel: 0, didRehab: true });
        RecoveryService.saveCheckIn({
          date: today,
          activities: [],
          injuryLogs: [{ injuryId: firstInjuryId, painLevel: 0, didRehab: true }],
          habits: { rehab: true, mobility: false, stretching: false, goodNutrition: false, enoughProtein: false },
        });
      },
      reply: 'Rehab completada para hoy ✓',
    };
  }

  // X min TYPE / he hecho X min de TYPE / he caminado X min / TYPE X min
  const activityPatterns: [RegExp, ActivityType][] = [
    [/(?:he?\s+)?(?:caminad?o?|walk(?:ed)?)\s+(\d+)\s*(?:min|minutos?)?/, 'walk'],
    [/(\d+)\s*(?:min|minutos?)?\s*(?:de\s+)?(?:caminar|caminado|walk)/, 'walk'],
    [/(?:he?\s+)?(?:corrido|run(?:ned)?)\s+(\d+)\s*(?:min|minutos?)?/, 'run'],
    [/(\d+)\s*(?:min|minutos?)?\s*(?:de\s+)?(?:correr|run)/, 'run'],
    [/(?:he?\s+)?(?:nadado|swim(?:med)?)\s+(\d+)\s*(?:min|minutos?)?/, 'swim'],
    [/(\d+)\s*(?:min|minutos?)?\s*(?:de\s+)?(?:nadar|swim)/, 'swim'],
    [/(\d+)\s*(?:min|minutos?)?\s*(?:de\s+)?(?:bici|bike|ciclismo)/, 'bike'],
    [/(?:he?\s+)?(?:ido\s+en\s+)?bici\s+(\d+)\s*(?:min|minutos?)?/, 'bike'],
    [/(\d+)\s*(?:min|minutos?)?\s*(?:de\s+)?(?:gym|pesas|fuerza)/, 'gym'],
    [/(\d+)\s*(?:min|minutos?)?\s*(?:de\s+)?(?:rehab|rehabilitaci[oó]n)/, 'rehab'],
    [/(\d+)\s*(?:min|minutos?)?\s*(?:de\s+)?mobilidad/, 'mobility'],
    // generic: X min TYPE
    [/(\d+)\s*(?:min|minutos?)?\s*(?:de\s+)?(\w+)/, null as unknown as ActivityType],
  ];

  for (const [regex, type] of activityPatterns) {
    if (type === null) break; // generic handled below
    const match = txt.match(regex);
    if (match) {
      const mins = parseInt(match[1]);
      return {
        action: () => RecoveryService.logActivity({ type, durationMinutes: mins, date: today }),
        reply: `Actividad guardada: ${mins} min de ${type} ✓`,
      };
    }
  }

  // generic "X min TYPE" or "TYPE X min"
  const genericActivity = txt.match(/(\d+)\s*(?:min|minutos?)\s+(?:de\s+)?(\w+)/);
  if (genericActivity) {
    const mins = parseInt(genericActivity[1]);
    const typeMap: Record<string, ActivityType> = {
      bici: 'bike', bike: 'bike', gym: 'gym', pesas: 'gym', caminar: 'walk', caminata: 'walk',
      correr: 'run', carrera: 'run', nadar: 'swim', piscina: 'swim', rehab: 'rehab',
      movilidad: 'mobility', mobility: 'mobility', walk: 'walk', run: 'run', swim: 'swim',
    };
    const rawType = genericActivity[2];
    const mappedType: ActivityType = typeMap[rawType] ?? 'other';
    return {
      action: () => RecoveryService.logActivity({ type: mappedType, durationMinutes: mins, notes: rawType !== mappedType ? rawType : undefined, date: today }),
      reply: `Actividad guardada: ${mins} min (${rawType}) ✓`,
    };
  }

  // "gym pecho tríceps" / "hice gym" / "gym hoy"
  const gymMatch = txt.match(/(?:gym|pesas|fuerza)\s*(.*)?/);
  if (gymMatch) {
    const note = gymMatch[1]?.trim() || undefined;
    return {
      action: () => RecoveryService.logActivity({ type: 'gym', durationMinutes: 45, notes: note, date: today }),
      reply: `Sesión de gym registrada${note ? ` · ${note}` : ''} ✓`,
    };
  }

  return null;
}

// ─── Quick Action Chips ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Peso', example: 'peso 78.0', icon: Scale },
  { label: 'Dolor', example: 'dolor 2', icon: Zap },
  { label: 'Rehab', example: 'rehab hecha', icon: CheckCircle },
  { label: 'Bici', example: '30 min bici', icon: Bike },
  { label: 'Gym', example: 'gym pecho', icon: Dumbbell },
  { label: 'Caminar', example: 'he caminado 40 min', icon: Footprints },
] as const;

// ─── Chat Panel ───────────────────────────────────────────────────────────────

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, addMessage } = useChatStore();
  const user = useSessionStore((s) => s.user);
  const firstActiveInjury = useRecoveryStore((s) =>
    s.injuries.find((i) => i.status !== 'resolved') ?? null,
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSubmitting || !user) return;

    addMessage({ role: 'user', content: message });
    setInput('');
    setIsSubmitting(true);

    await new Promise((r) => setTimeout(r, 250));

    const parsed = parseMessage(
      message,
      firstActiveInjury?.id ?? null,
      firstActiveInjury?.name ?? null,
    );

    if (parsed) {
      try {
        parsed.action();
        addMessage({ role: 'assistant', content: parsed.reply });
      } catch {
        addMessage({ role: 'assistant', content: 'Algo fue mal al guardar. Inténtalo de nuevo.' });
      }
    } else {
      addMessage({
        role: 'assistant',
        content: 'No he entendido ese comando. Prueba: "peso 78", "dolor 3", "rehab hecha", "30 min bici", "gym pecho".',
      });
    }

    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh]">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-canvas">
        <h1 className="text-2xl font-bold text-ink">Chat</h1>
        <p className="text-sm text-ink/40 mt-0.5">Registra en lenguaje natural</p>
      </div>

      {/* Quick Action Chips */}
      <div className="px-4 pb-3 bg-canvas">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {QUICK_ACTIONS.map(({ label, example, icon: Icon }) => (
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
      <div className="flex-1 overflow-y-auto px-4 space-y-3 scroll-smooth-ios no-scrollbar pb-4 bg-canvas">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-center">
            <p className="text-sm text-ink/30">Escribe algo para empezar</p>
            <p className="text-xs text-ink/20">Ej: "peso 78.2" · "30 min bici" · "rehab hecha"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
