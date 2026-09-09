'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowUp,
  CalendarDays,
  Dumbbell,
  HeartPulse,
  MoonStar,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { todayIso } from '../lib/date';
import { getJson } from '../lib/api';
import { RecoveryService } from '../lib/services';
import { useChatStore } from '../stores/chat-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';

const SUGGESTIONS = [
  { label: 'Mi estado hoy', prompt: '¿Cómo estoy hoy y qué debería hacer?', icon: HeartPulse },
  { label: 'Entrenamiento', prompt: '¿Me conviene entrenar fuerte hoy?', icon: Dumbbell },
  { label: 'Última semana', prompt: 'Resume mi última semana y dime qué mejorarías', icon: TrendingUp },
  { label: 'Sueño', prompt: 'Analiza cómo estoy durmiendo últimamente', icon: MoonStar },
] as const;

type AgentStatus = { configured: boolean; provider: 'openai' | 'unavailable'; model: string | null };

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, addMessage, resetMessages } = useChatStore();
  const user = useSessionStore((state) => state.user);
  const selectedDate = useRecoveryStore((state) => state.selectedDate);
  const today = todayIso();
  const isToday = selectedDate === today;
  const dateLabel = isToday
    ? 'Hoy'
    : new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  useEffect(() => {
    window.localStorage.removeItem('recoveryos-chat-v1');
    getJson<AgentStatus>('/chat/status')
      .then(setAgentStatus)
      .catch(() => setAgentStatus({ configured: false, provider: 'unavailable', model: null }));
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 104)}px`;
  }, [input]);

  async function sendMessage(message: string) {
    const content = message.trim();
    if (!content || isSubmitting || !user || !agentStatus?.configured) return;

    addMessage({ role: 'user', content });
    setInput('');
    setIsSubmitting(true);

    try {
      const response = await RecoveryService.sendToHealthAgent(content, selectedDate);
      addMessage({ role: 'assistant', content: response.reply });
    } catch {
      addMessage({
        role: 'assistant',
        content: 'No he podido conectar con OpenAI. Revisa la configuración e inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-0 flex-col overflow-hidden bg-canvas">
      <section className="px-4 pb-3 pt-3">
        <div className="relative overflow-hidden rounded-[28px] bg-ink px-5 py-4 text-white shadow-card-lg">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-moss/35 blur-2xl" />
          <div className="relative flex items-start gap-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Sparkles size={20} className="text-sand" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] font-semibold tracking-tight">Recovery Agent</h1>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    agentStatus?.configured
                      ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.12)]'
                      : 'bg-white/30'
                  }`}
                />
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-white/55">
                {agentStatus === null
                  ? 'Comprobando conexión…'
                  : agentStatus.configured
                    ? 'Analiza tus datos y te ayuda a decidir mejor'
                    : 'OpenAI todavía no está configurado'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[10px] font-medium text-white/65 ring-1 ring-white/10">
              <CalendarDays size={11} />
              {dateLabel}
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SUGGESTIONS.map(({ label, prompt, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => void sendMessage(prompt)}
              disabled={isSubmitting || !user || !agentStatus?.configured}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-ink/7 bg-white px-3.5 py-2 text-xs font-medium text-ink/70 shadow-card transition-all active:scale-[0.97] disabled:opacity-40"
            >
              <Icon size={13} className="text-moss" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-4 pb-5 scroll-smooth-ios no-scrollbar">
          {!agentStatus?.configured && agentStatus !== null ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 pb-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-ember/10 text-ember">
                <Sparkles size={22} />
              </div>
              <h2 className="text-base font-semibold text-ink">Falta conectar OpenAI</h2>
              <p className="mt-2 max-w-[290px] text-sm leading-relaxed text-ink/45">
                Añade una clave real en <span className="font-medium text-ink/65">OPENAI_API_KEY</span> y reinicia la API. No se usarán respuestas simuladas.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-5 pb-10 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-moss/15 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-card ring-1 ring-ink/5">
                  <Activity size={25} className="text-moss" />
                </div>
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">¿Qué quieres saber?</h2>
              <p className="mt-2 max-w-[285px] text-sm leading-relaxed text-ink/45">
                Puedo cruzar sueño, recuperación, actividad, nutrición, peso y lesiones para darte una respuesta personal.
              </p>
              <button
                type="button"
                onClick={() => void sendMessage(SUGGESTIONS[0].prompt)}
                className="mt-5 rounded-2xl bg-moss/10 px-4 py-2.5 text-xs font-semibold text-moss transition-transform active:scale-95"
              >
                Analizar mi día
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={resetMessages}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium text-ink/35 transition-colors hover:bg-white hover:text-ink/60"
                >
                  <RotateCcw size={11} />
                  Nueva conversación
                </button>
              </div>

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-end gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-moss text-white shadow-sm">
                      <Sparkles size={13} />
                    </div>
                  )}
                  <div
                    className={`max-w-[84%] whitespace-pre-wrap px-4 py-3 text-[13px] leading-[1.55] ${
                      message.role === 'user'
                        ? 'rounded-[22px] rounded-br-md bg-ink text-white shadow-sm'
                        : 'rounded-[22px] rounded-bl-md border border-ink/5 bg-white text-ink/85 shadow-card'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isSubmitting && (
                <div className="flex items-end gap-2.5">
                  <div className="mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-moss text-white shadow-sm">
                    <Sparkles size={13} />
                  </div>
                  <div className="rounded-[22px] rounded-bl-md border border-ink/5 bg-white px-4 py-3 shadow-card">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-moss/55"
                            style={{ animationDelay: `${dot * 140}ms` }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-ink/40">Analizando tus datos</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-canvas to-transparent" />
      </div>

      <div className="border-t border-ink/5 bg-canvas/95 px-4 pt-3 backdrop-blur-md">
        <form
          onSubmit={onSubmit}
          className="flex items-end gap-2 rounded-[24px] border border-ink/8 bg-white p-1.5 pl-4 shadow-card-lg transition-shadow focus-within:ring-2 focus-within:ring-moss/10"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={!user || isSubmitting || !agentStatus?.configured}
            rows={1}
            placeholder="Pregunta o registra algo…"
            className="max-h-[104px] min-h-[42px] flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 text-ink outline-none placeholder:text-ink/30 disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="Enviar mensaje"
            disabled={isSubmitting || !input.trim() || !user || !agentStatus?.configured}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] bg-ink text-white shadow-sm transition-all active:scale-95 disabled:bg-ink/20 disabled:shadow-none"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </form>
        <p className="py-2 text-center text-[9px] text-ink/25">
          Orientación basada en tus datos · No sustituye consejo médico
        </p>
      </div>
    </div>
  );
}
