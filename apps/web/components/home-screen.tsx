'use client';

import { useState } from 'react';
import { WeeklyCalendar } from './weekly-calendar';
import { QuickCheckInSheet } from './quick-checkin-sheet';
import { WeightSheet } from './weight-sheet';
import { useRecoveryStore } from '../stores/recovery-store';
import {
  buildRuleBasedInsight,
  calculateRecoveryScore,
  calculateRehabAdherence,
  calculateWeightTrend,
  weeklyActivityStats,
  weeklyPainAverage,
} from '../lib/metrics';
import { formatShortDate, sameDay, todayIso } from '../lib/date';
import { useSessionStore } from '../stores/session-store';
import { Sparkles, Scale, Zap, Bike, CheckCircle2, Circle, Plus, Clock, Dumbbell } from 'lucide-react';

// ─── Recovery Score Ring ─────────────────────────────────────────────────────

function RecoveryRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#54715a' : score >= 50 ? '#b56b45' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e8e3d8" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-ink leading-none">{score}</span>
        <span className="text-xs text-ink/50 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─── Checklist Item ──────────────────────────────────────────────────────────

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {done
        ? <CheckCircle2 size={20} className="text-moss flex-shrink-0" />
        : <Circle size={20} className="text-ink/20 flex-shrink-0" />}
      <span className={`text-sm ${done ? 'text-ink/40 line-through' : 'text-ink'}`}>{label}</span>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-3xl p-4 space-y-2 text-left w-full ${accent ? 'bg-ink' : 'bg-white shadow-card'} ${onClick ? 'active:scale-[0.97] transition-transform' : ''}`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent ? 'bg-white/10' : 'bg-canvas'}`}>
        <Icon size={16} className={accent ? 'text-white' : 'text-moss'} />
      </div>
      <div>
        <p className={`text-[11px] font-medium uppercase tracking-wide ${accent ? 'text-white/60' : 'text-ink/40'}`}>{label}</p>
        <p className={`text-xl font-bold leading-tight mt-0.5 ${accent ? 'text-white' : 'text-ink'}`}>{value}</p>
        {sub && <p className={`text-[11px] mt-0.5 ${accent ? 'text-white/50' : 'text-ink/40'}`}>{sub}</p>}
      </div>
    </Tag>
  );
}

// ─── Day Detail Panel ────────────────────────────────────────────────────────

function DayDetail({ date }: { date: string }) {
  const { checkIns, weightEntries, activities, injuryLogs } = useRecoveryStore();

  const checkIn  = checkIns.find((c) => sameDay(c.date, date));
  const weight   = weightEntries.find((w) => sameDay(w.date, date));
  const dayActs  = activities.filter((a) => sameDay(a.date, date));
  const dayLogs  = injuryLogs.filter((l) => sameDay(l.date, date));

  const hasData  = checkIn || weight || dayActs.length > 0 || dayLogs.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-3xl bg-canvas-light border border-sand/40 px-4 py-5 text-center space-y-1 animate-fade-in">
        <p className="text-sm font-medium text-ink/40">Sin datos para este día</p>
        <p className="text-xs text-ink/25">Usa el chat o el check-in para registrar</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white shadow-card p-4 space-y-3 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/30">{formatShortDate(date)}</p>

      {weight && (
        <div className="flex items-center gap-2 text-sm text-ink">
          <Scale size={14} className="text-moss" />
          <span className="font-semibold">{weight.weightKg.toFixed(1)} kg</span>
        </div>
      )}

      {dayActs.length > 0 && (
        <div className="space-y-1">
          {dayActs.map((act) => (
            <div key={act.id} className="flex items-center gap-2 text-sm text-ink">
              <Dumbbell size={14} className="text-moss" />
              <span className="capitalize font-medium">{act.type}</span>
              {act.durationMinutes && (
                <span className="flex items-center gap-0.5 text-ink/40 text-xs">
                  <Clock size={11} />
                  {act.durationMinutes}m
                </span>
              )}
              {act.notes && <span className="text-ink/40 text-xs">· {act.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {dayLogs.length > 0 && (
        <div className="space-y-1">
          {dayLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-sm">
              <Zap size={14} className={log.painLevel >= 5 ? 'text-ember' : 'text-moss'} />
              <span className="text-ink">Dolor <span className="font-semibold">{log.painLevel}/10</span></span>
              {log.didRehab && (
                <span className="rounded-full bg-moss-light text-moss text-[10px] font-medium px-2 py-0.5">Rehab ✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {checkIn?.habits && (() => {
        const done = Object.entries(checkIn.habits).filter(([, v]) => v).map(([k]) => k);
        return done.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {done.map((h) => (
              <span key={h} className="rounded-full bg-canvas text-ink/50 text-[10px] font-medium px-2 py-0.5 capitalize">{h}</span>
            ))}
          </div>
        ) : null;
      })()}

      {checkIn?.notes && (
        <p className="text-xs text-ink/40 italic">"{checkIn.notes}"</p>
      )}
    </div>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

export function HomeScreen() {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showWeightSheet, setShowWeightSheet] = useState(false);
  const user = useSessionStore((s) => s.user);
  const {
    selectedDate,
    setSelectedDate,
    checkIns,
    weightEntries,
    activities,
    injuryLogs,
    injuries,
  } = useRecoveryStore();

  const today = todayIso();
  const isToday = sameDay(selectedDate, today);

  const todayCheckIn    = checkIns.find((e) => sameDay(e.date, today));
  const todayActivities = activities.filter((e) => sameDay(e.date, today));
  const currentWeight   = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const rehabAdherence  = calculateRehabAdherence(checkIns);
  const painAverage     = weeklyPainAverage(injuries, injuryLogs);
  const weeklyActivity  = weeklyActivityStats(activities);
  const weightTrend     = calculateWeightTrend(weightEntries);
  const recoveryScore   = calculateRecoveryScore({ activeInjuries: injuries, injuryLogs, todayCheckIn, todayActivities });
  const insight         = buildRuleBasedInsight({ activeInjuries: injuries, injuryLogs, checkIns, weights: weightEntries });

  const hasRehabToday   = todayCheckIn?.habits.rehab || injuryLogs.some((l) => sameDay(l.date, today) && l.didRehab);
  const hasActivityToday = todayActivities.length > 0;
  const hasWeightToday  = weightEntries.some((e) => sameDay(e.date, today));
  const hasFoodToday    = !!todayCheckIn?.habits.goodNutrition;

  const firstName = user?.name?.split(' ')[0] ?? 'David';
  const now = new Date();
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dateLabel = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]}`;

  return (
    <>
      <div className="px-4 pt-12 pb-4 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-ink/40 uppercase tracking-widest">{dateLabel}</p>
          <h1 className="text-3xl font-bold text-ink leading-tight">Hola, {firstName} 👋</h1>
          <p className="text-sm text-ink/50">Vamos a seguir recuperando bien.</p>
        </div>

        {/* Recovery Score */}
        <div className="rounded-4xl bg-white shadow-card p-6 flex items-center gap-6">
          <RecoveryRing score={recoveryScore} />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">Recovery Score</p>
              <p className="text-sm text-ink/60 mt-1 leading-snug">
                {recoveryScore >= 75 ? 'Recuperación en buen camino'
                  : recoveryScore >= 50 ? 'Sigue con la rehab diaria'
                  : 'Necesitas descansar más'}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-ink/40">
                <span>Rehab sem.</span>
                <span>{rehabAdherence}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                <div
                  className="h-full rounded-full bg-moss transition-all duration-700"
                  style={{ width: `${rehabAdherence}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Calendar */}
        <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Esta semana</p>
            <span className="text-xs text-ink/40 font-medium">{formatShortDate(selectedDate)}</span>
          </div>
          <WeeklyCalendar
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            checkIns={checkIns}
            weights={weightEntries}
            activities={activities}
            injuryLogs={injuryLogs}
          />
        </div>

        {/* Day Detail (only when a past day is selected, not today) */}
        {!isToday && <DayDetail date={selectedDate} />}

        {/* Today section */}
        <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Hoy — tareas</p>
            <button
              type="button"
              onClick={() => setShowCheckIn(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-ink px-3.5 py-2"
            >
              <Plus size={13} className="text-white" />
              <span className="text-xs font-semibold text-white">Registrar</span>
            </button>
          </div>

          <div className="divide-y divide-ink/5">
            <div className="pb-2"><CheckItem done={hasRehabToday} label="Rehabilitación" /></div>
            <div className="py-2"><CheckItem done={hasFoodToday} label="Nutrición registrada" /></div>
            <div className="py-2"><CheckItem done={hasActivityToday} label="Actividad del día" /></div>
            <div className="pt-2"><CheckItem done={hasWeightToday} label="Peso registrado" /></div>
          </div>
        </div>

        {/* 2x2 Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Scale}
            label="Peso"
            value={currentWeight ? `${currentWeight.weightKg.toFixed(1)} kg` : '--'}
            sub={weightTrend.weeklyChange !== null
              ? `${weightTrend.weeklyChange > 0 ? '+' : ''}${weightTrend.weeklyChange} kg sem.`
              : undefined}
            onClick={() => setShowWeightSheet(true)}
          />
          <MetricCard
            icon={Zap}
            label="Dolor"
            value={painAverage !== null ? `${painAverage}/10` : '--'}
            sub={injuries.filter((i) => i.status !== 'resolved').map((i) => i.name).join(', ') || 'Sin lesiones'}
            accent={painAverage !== null && painAverage >= 5}
          />
          <MetricCard
            icon={Bike}
            label="Actividad"
            value={weeklyActivity.totalMinutes >= 60
              ? `${Math.floor(weeklyActivity.totalMinutes / 60)}h ${weeklyActivity.totalMinutes % 60}m`
              : `${weeklyActivity.totalMinutes} min`}
            sub={`${weeklyActivity.totalSessions} sesiones`}
          />
          <MetricCard
            icon={CheckCircle2}
            label="Rehab"
            value={`${rehabAdherence}%`}
            sub="últimos 7 días"
          />
        </div>

        {/* AI Insight */}
        <div className="rounded-4xl bg-ink p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Insight</p>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
        </div>
      </div>

      {/* Quick Check-in Sheet */}
      <QuickCheckInSheet
        isOpen={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        date={today}
      />

      {/* Weight Sheet */}
      <WeightSheet
        isOpen={showWeightSheet}
        onClose={() => setShowWeightSheet(false)}
        defaultDate={selectedDate}
      />
    </>
  );
}
