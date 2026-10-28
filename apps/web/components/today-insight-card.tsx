'use client';

import { useEffect, useState } from 'react';
import { Sparkles, MessageCircle, Loader2 } from 'lucide-react';
import { RecoveryService } from '../lib/services';

const cacheKey = (date: string) => `pulso-insight-${date}`;

function readCache(date: string): string | null {
  try { return window.localStorage.getItem(cacheKey(date)); } catch { return null; }
}
function writeCache(date: string, text: string) {
  try { window.localStorage.setItem(cacheKey(date), text); } catch { /* storage unavailable */ }
}

export function TodayInsightCard({
  date, ruleInsight, isToday, onAskAgent,
}: {
  date: string;
  /** Instant, local observation shown until (or without) the AI analysis. */
  ruleInsight: string;
  isToday: boolean;
  onAskAgent?: (prompt: string) => void;
}) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAiText(readCache(date));
    setFailed(false);
  }, [date]);

  async function analyze() {
    setLoading(true);
    setFailed(false);
    try {
      const prompt = `Dime en un máximo de 2 frases lo más importante de ${isToday ? 'mi día de hoy' : 'este día'} y qué haría. Sin saludos, sin listas y sin registrar ni cambiar ningún dato.`;
      const response = await RecoveryService.sendToHealthAgent(prompt, date);
      const text = response.reply.trim();
      writeCache(date, text);
      setAiText(text);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-4xl bg-moss-light p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-xl bg-white/70 flex items-center justify-center">
          <Sparkles size={14} className="text-moss" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/60">Lo que he visto</p>
      </div>
      <p className="text-sm text-ink/90 leading-relaxed">{aiText ?? ruleInsight}</p>
      {failed && <p className="text-xs text-ember">No he podido generar el análisis ahora mismo.</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-ink active:scale-95 transition-transform disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="text-moss" />}
          {aiText ? 'Actualizar análisis' : 'Analizar con IA'}
        </button>
        {onAskAgent && (
          <button
            type="button"
            onClick={() => onAskAgent(isToday ? '¿Cómo estoy hoy y qué debería hacer?' : `¿Cómo fue mi día ${date}?`)}
            className="flex items-center gap-1.5 rounded-full bg-white/60 px-3.5 py-2 text-xs font-semibold text-ink active:scale-95 transition-transform"
          >
            <MessageCircle size={13} /> Preguntar a Pulso
          </button>
        )}
      </div>
    </div>
  );
}
