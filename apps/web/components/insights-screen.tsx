'use client';

import { TrendingDown, Bike, Brain, Flame, CheckCircle2, Scale } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import {
  buildRuleBasedInsight,
  calculateRecoveryScore,
  calculateRehabAdherence,
  weeklyActivityStats,
  weeklyPainAverage,
  calculateWeightTrend,
} from '../lib/metrics';
import { todayIso, sameDay } from '../lib/date';

type InsightCard = {
  icon: React.ElementType;
  category: string;
  message: string;
  accent: string;
  bg: string;
};

export function InsightsScreen() {
  const { injuries, injuryLogs, checkIns, weightEntries, activities } = useRecoveryStore();
  const todayCheckIn = checkIns.find((e) => sameDay(e.date, todayIso()));
  const todayActivities = activities.filter((e) => sameDay(e.date, todayIso()));
  const recoveryScore = calculateRecoveryScore({ activeInjuries: injuries, injuryLogs, todayCheckIn, todayActivities });
  const insight = buildRuleBasedInsight({ activeInjuries: injuries, injuryLogs, checkIns, weights: weightEntries });
  const rehabAdherence = calculateRehabAdherence(checkIns);
  const activity = weeklyActivityStats(activities);
  const painAvg = weeklyPainAverage(injuries, injuryLogs);
  const weightTrend = calculateWeightTrend(weightEntries);

  const insightCards: InsightCard[] = [
    {
      icon: Brain,
      category: 'Recuperación',
      message: insight,
      accent: 'text-moss',
      bg: 'bg-moss-light',
    },
    {
      icon: CheckCircle2,
      category: 'Rehab',
      message: rehabAdherence >= 70
        ? `Llevas un ${rehabAdherence}% de adherencia a la rehab. Excelente constancia.`
        : `Adherencia rehab: ${rehabAdherence}%. Intenta mantener 5 días de rehab por semana.`,
      accent: rehabAdherence >= 70 ? 'text-moss' : 'text-ember',
      bg: rehabAdherence >= 70 ? 'bg-moss-light' : 'bg-ember-light',
    },
    {
      icon: Bike,
      category: 'Actividad',
      message: activity.totalMinutes > 0
        ? `Esta semana has acumulado ${activity.totalMinutes} minutos en ${activity.totalSessions} sesiones.`
        : 'Aún no hay actividad registrada esta semana. Empieza con algo suave.',
      accent: 'text-ink',
      bg: 'bg-canvas-light',
    },
    {
      icon: Scale,
      category: 'Peso',
      message: weightTrend.weeklyChange !== null
        ? `Tu peso está cambiando ${weightTrend.weeklyChange > 0 ? '+' : ''}${weightTrend.weeklyChange} kg esta semana. ${weightTrend.weeklyChange <= 0 ? 'Buen ritmo.' : 'Vigila la alimentación.'}`
        : 'Registra tu peso diariamente para ver tendencias.',
      accent: 'text-ink',
      bg: 'bg-sand-light',
    },
    {
      icon: TrendingDown,
      category: 'Dolor',
      message: painAvg !== null
        ? `Dolor medio actual: ${painAvg}/10. ${painAvg <= 3 ? 'Muy buena evolución.' : painAvg <= 6 ? 'Mantén la rehab y el descanso.' : 'El dolor es alto. Considera reducir carga.'}`
        : 'Sin registros de dolor. Recuerda anotar tu estado cada día.',
      accent: painAvg !== null && painAvg >= 5 ? 'text-ember' : 'text-moss',
      bg: painAvg !== null && painAvg >= 5 ? 'bg-ember-light' : 'bg-moss-light',
    },
    {
      icon: Flame,
      category: 'Motivación',
      message: recoveryScore >= 75
        ? `Recovery Score ${recoveryScore}/100. Estás en tu mejor racha. Sigue así.`
        : `Recovery Score ${recoveryScore}/100. Pequeños pasos diarios generan grandes cambios.`,
      accent: recoveryScore >= 75 ? 'text-moss' : 'text-ember',
      bg: recoveryScore >= 75 ? 'bg-moss-light' : 'bg-ember-light',
    },
  ];

  return (
    <div className="px-4 pt-12 pb-4 space-y-5 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">Insights</h1>
        <p className="text-sm text-ink/40">Tu coach personal</p>
      </div>

      {/* Recovery Score badge */}
      <div className="rounded-4xl bg-ink p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Esta semana</p>
          <p className="text-3xl font-bold text-white">{recoveryScore}<span className="text-base font-normal text-white/40"> /100</span></p>
          <p className="text-sm text-white/60">Recovery Score</p>
        </div>
        <div className="text-right space-y-2">
          <div className="space-y-0.5">
            <p className="text-xs text-white/40">Rehab</p>
            <p className="text-sm font-semibold text-white">{rehabAdherence}%</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-white/40">Actividad</p>
            <p className="text-sm font-semibold text-white">{activity.totalMinutes}m</p>
          </div>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="space-y-3">
        {insightCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.category} className={`rounded-3xl ${card.bg} p-4 space-y-2`}>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-white/60 flex items-center justify-center">
                  <Icon size={14} className={card.accent} />
                </div>
                <p className={`text-[11px] font-semibold uppercase tracking-widest ${card.accent}`}>
                  {card.category}
                </p>
              </div>
              <p className="text-sm text-ink/80 leading-relaxed">{card.message}</p>
            </div>
          );
        })}
      </div>

      {/* Future integrations */}
      <div className="rounded-4xl border border-sand/60 bg-canvas-light p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/30">Próximamente</p>
        {['Strava — actividad automática', 'Coros — sueño y HRV', 'IA real — insights con GPT'].map((item) => (
          <div key={item} className="flex items-center justify-between py-1">
            <span className="text-sm text-ink/50">{item}</span>
            <span className="rounded-full bg-sand/40 px-2.5 py-0.5 text-[10px] font-medium text-ink/30">soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}
