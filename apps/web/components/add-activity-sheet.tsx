'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { RecoveryService } from '../lib/services';
import { todayIso } from '../lib/date';
import { Portal } from './portal';
import type { ActivityEntry, ActivityType, MuscleGroup } from '../stores/recovery-store';

const ACTIVITY_OPTS: { type: ActivityType; label: string; emoji: string }[] = [
  { type: 'gym',      label: 'Gym',       emoji: '🏋️' },
  { type: 'bike',     label: 'Bici',      emoji: '🚴' },
  { type: 'run',      label: 'Correr',    emoji: '🏃' },
  { type: 'walk',     label: 'Caminar',   emoji: '🚶' },
  { type: 'swim',     label: 'Nadar',     emoji: '🏊' },
  { type: 'mobility', label: 'Movilidad', emoji: '🧘' },
  { type: 'other',    label: 'Otro',      emoji: '⚡' },
];

const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'pecho',    label: 'Pecho'    },
  { id: 'espalda',  label: 'Espalda'  },
  { id: 'biceps',   label: 'Bíceps'   },
  { id: 'triceps',  label: 'Tríceps'  },
  { id: 'hombro',   label: 'Hombro'   },
  { id: 'core',     label: 'Core'     },
  { id: 'pierna',   label: 'Pierna'   },
  { id: 'gluteo',   label: 'Glúteo'   },
];

function paceToSec(mm: string, ss: string): number | undefined {
  const m = parseInt(mm, 10);
  const s = parseInt(ss, 10);
  if (isNaN(m) && isNaN(s)) return undefined;
  return (isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s);
}

function secToPace(sec: number): { mm: string; ss: string } {
  return { mm: String(Math.floor(sec / 60)), ss: String(sec % 60).padStart(2, '0') };
}

function Field({
  label, unit, value, onChange, placeholder = '0', type = 'number',
}: {
  label: string; unit?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-1">{label}</p>
      <div className="relative">
        <input
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl bg-canvas-light border border-ink/8 px-3 py-2.5 text-sm outline-none"
          style={unit ? { paddingRight: `${unit.length * 8 + 16}px` } : {}}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/35 pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function AddActivitySheet({
  isOpen,
  onClose,
  editActivity,
  prefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  editActivity?: ActivityEntry;
  prefill?: { type: ActivityType; muscleGroups?: MuscleGroup[] };
}) {
  const isEditing = !!editActivity;

  const [type, setType] = useState<ActivityType | null>(null);
  const [durH,       setDurH]       = useState('');
  const [durM,       setDurM]       = useState('');
  const [kcal,       setKcal]       = useState('');
  const [avgHr,      setAvgHr]      = useState('');
  const [notes,      setNotes]      = useState('');
  const [date,       setDate]       = useState(todayIso);
  const [distKm,     setDistKm]     = useState('');
  const [paceMm,     setPaceMm]     = useState('');
  const [paceSs,     setPaceSs]     = useState('');
  const [elevGain,   setElevGain]   = useState('');
  const [cadSpm,     setCadSpm]     = useState('');
  const [speedKmh,   setSpeedKmh]   = useState('');
  const [powerW,     setPowerW]     = useState('');
  const [cadRpm,     setCadRpm]     = useState('');
  const [distM,      setDistM]      = useState('');
  const [pace100,    setPace100]    = useState('');
  const [muscles,    setMuscles]    = useState<MuscleGroup[]>([]);
  const [volumeKg,   setVolumeKg]   = useState('');
  const [saved,      setSaved]      = useState(false);

  const totalDurationMin = parseInt(durH || '0') * 60 + parseInt(durM || '0');

  // Prefill when editing or when a plan entry is passed
  useEffect(() => {
    if (!isOpen) return;
    if (editActivity) {
      setType(editActivity.type);
      const dm = editActivity.durationMinutes ?? 0;
      setDurH(dm >= 60 ? String(Math.floor(dm / 60)) : '');
      setDurM(dm % 60 ? String(dm % 60) : '');
      setKcal(editActivity.kcal ? String(editActivity.kcal) : '');
      setAvgHr(editActivity.avgHeartRateBpm ? String(editActivity.avgHeartRateBpm) : '');
      setNotes(editActivity.notes ?? '');
      setDate(editActivity.date);
      setDistKm(editActivity.distanceKm ? String(editActivity.distanceKm) : '');
      setElevGain(editActivity.elevationGainM ? String(editActivity.elevationGainM) : '');
      setCadSpm(editActivity.avgCadenceSpm ? String(editActivity.avgCadenceSpm) : '');
      if (editActivity.avgPaceSecPerKm) {
        const p = secToPace(editActivity.avgPaceSecPerKm);
        setPaceMm(p.mm); setPaceSs(p.ss);
      } else { setPaceMm(''); setPaceSs(''); }
      setSpeedKmh(editActivity.avgSpeedKmh ? String(editActivity.avgSpeedKmh) : '');
      setPowerW(editActivity.avgPowerW ? String(editActivity.avgPowerW) : '');
      setCadRpm(editActivity.avgCadenceRpm ? String(editActivity.avgCadenceRpm) : '');
      setDistM(editActivity.distanceM ? String(editActivity.distanceM) : '');
      setPace100(editActivity.avgPacePer100mSec ? String(editActivity.avgPacePer100mSec) : '');
      setMuscles((editActivity.muscleGroups ?? []) as MuscleGroup[]);
      setVolumeKg(editActivity.totalVolumeKg ? String(editActivity.totalVolumeKg) : '');
    } else {
      reset();
      if (prefill) {
        setType(prefill.type);
        setMuscles(prefill.muscleGroups ?? []);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editActivity?.id]);

  function reset() {
    setType(null);
    setDurH(''); setDurM(''); setKcal(''); setAvgHr(''); setNotes(''); setDate(todayIso());
    setDistKm(''); setPaceMm(''); setPaceSs(''); setElevGain(''); setCadSpm('');
    setSpeedKmh(''); setPowerW(''); setCadRpm('');
    setDistM(''); setPace100('');
    setMuscles([]); setVolumeKg('');
    setSaved(false);
  }

  function handleSave() {
    if (!type) return;

    RecoveryService.logActivity({
      id:              editActivity?.id,
      type,
      date,
      durationMinutes: totalDurationMin > 0 ? totalDurationMin : undefined,
      kcal:            kcal     ? parseInt(kcal, 10)     : undefined,
      avgHeartRateBpm: avgHr    ? parseInt(avgHr, 10)    : undefined,
      notes:           notes.trim() || undefined,
      stravaId:        editActivity?.stravaId,
      stravaName:      editActivity?.stravaName,
      ...(type === 'run' || type === 'walk' ? {
        distanceKm:      distKm   ? parseFloat(distKm)         : undefined,
        avgPaceSecPerKm: paceToSec(paceMm, paceSs),
        elevationGainM:  elevGain ? parseInt(elevGain, 10)      : undefined,
        avgCadenceSpm:   cadSpm   ? parseInt(cadSpm, 10)        : undefined,
      } : {}),
      ...(type === 'bike' ? {
        distanceKm:     distKm   ? parseFloat(distKm)          : undefined,
        avgSpeedKmh:    speedKmh ? parseFloat(speedKmh)        : undefined,
        elevationGainM: elevGain ? parseInt(elevGain, 10)      : undefined,
        avgPowerW:      powerW   ? parseInt(powerW, 10)        : undefined,
        avgCadenceRpm:  cadRpm   ? parseInt(cadRpm, 10)        : undefined,
      } : {}),
      ...(type === 'swim' ? {
        distanceM:         distM   ? parseInt(distM, 10)       : undefined,
        avgPacePer100mSec: pace100 ? parseInt(pace100, 10)     : undefined,
      } : {}),
      ...(type === 'gym' ? {
        muscleGroups: muscles.length > 0 ? muscles : undefined,
        totalVolumeKg: volumeKg ? parseFloat(volumeKg) : undefined,
      } : {}),
    });
    setSaved(true);
    setTimeout(() => { reset(); onClose(); }, 800);
  }

  if (!isOpen) return null;

  const isRun  = type === 'run' || type === 'walk';
  const isBike = type === 'bike';
  const isSwim = type === 'swim';
  const isGym  = type === 'gym';

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[61] animate-slide-up">
        <div
          className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-y-auto"
          style={{ maxHeight: '92vh' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="px-5 pb-10 space-y-5">
            <div className="flex items-center justify-between pt-2">
              <h2 className="text-xl font-bold text-ink">
                {isEditing ? 'Editar actividad' : 'Nueva actividad'}
              </h2>
              <button type="button" onClick={onClose}
                className="h-9 w-9 rounded-2xl bg-canvas-light flex items-center justify-center">
                <X size={16} className="text-ink/60" />
              </button>
            </div>

            {/* Type grid */}
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITY_OPTS.map(({ type: t, label, emoji }) => (
                <button key={t} type="button"
                  onClick={() => setType(type === t ? null : t)}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-3 px-1 text-center transition-all ${
                    type === t ? 'bg-ink text-white' : 'bg-canvas-light text-ink'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </button>
              ))}
            </div>

            {type && (
              <>
                {isGym && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-ink/50">Grupos musculares</p>
                    <div className="flex flex-wrap gap-2">
                      {MUSCLE_GROUPS.map(({ id, label }) => (
                        <button key={id} type="button"
                          onClick={() => setMuscles((prev) =>
                            prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
                          )}
                          className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition-all ${
                            muscles.includes(id) ? 'bg-ink text-white' : 'bg-canvas-light text-ink/60'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <Field label="Volumen total" unit="kg" value={volumeKg} onChange={setVolumeKg} placeholder="2 500" />
                  </div>
                )}

                {isRun && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Field label="Distancia" unit="km" value={distKm} onChange={setDistKm} placeholder="10.0" />
                      <Field label="Desnivel" unit="m" value={elevGain} onChange={setElevGain} placeholder="120" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-1">Ritmo medio</p>
                      <div className="flex items-center gap-1">
                        <input type="number" inputMode="numeric" value={paceMm} onChange={(e) => setPaceMm(e.target.value)}
                          placeholder="4" className="w-16 rounded-2xl bg-canvas-light border border-ink/8 px-3 py-2.5 text-sm outline-none text-center" />
                        <span className="text-ink/40 font-bold">:</span>
                        <input type="number" inputMode="numeric" value={paceSs} onChange={(e) => setPaceSs(e.target.value)}
                          placeholder="30" className="w-16 rounded-2xl bg-canvas-light border border-ink/8 px-3 py-2.5 text-sm outline-none text-center" />
                        <span className="text-xs text-ink/35 ml-1">min/km</span>
                      </div>
                    </div>
                    <Field label="Cadencia" unit="spm" value={cadSpm} onChange={setCadSpm} placeholder="175" />
                  </div>
                )}

                {isBike && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Field label="Distancia" unit="km" value={distKm} onChange={setDistKm} placeholder="40.0" />
                      <Field label="Velocidad media" unit="km/h" value={speedKmh} onChange={setSpeedKmh} placeholder="28.5" />
                    </div>
                    <div className="flex gap-2">
                      <Field label="Desnivel" unit="m" value={elevGain} onChange={setElevGain} placeholder="350" />
                      <Field label="Potencia media" unit="W" value={powerW} onChange={setPowerW} placeholder="200" />
                    </div>
                    <Field label="Cadencia" unit="rpm" value={cadRpm} onChange={setCadRpm} placeholder="85" />
                  </div>
                )}

                {isSwim && (
                  <div className="flex gap-2">
                    <Field label="Distancia" unit="m" value={distM} onChange={setDistM} placeholder="2 000" />
                    <Field label="Ritmo / 100 m" unit="seg" value={pace100} onChange={setPace100} placeholder="95" />
                  </div>
                )}

                <div className="flex gap-2">
                  {/* Duration: h + min */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-1">Duración</p>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" inputMode="numeric" min={0} max={23}
                        value={durH} onChange={(e) => setDurH(e.target.value)}
                        placeholder="0"
                        className="w-10 rounded-xl bg-canvas-light border border-ink/8 px-2 py-2.5 text-sm outline-none text-center"
                      />
                      <span className="text-xs text-ink/35 font-semibold">h</span>
                      <input
                        type="number" inputMode="numeric" min={0} max={59}
                        value={durM} onChange={(e) => setDurM(e.target.value)}
                        placeholder="00"
                        className="w-12 rounded-xl bg-canvas-light border border-ink/8 px-2 py-2.5 text-sm outline-none text-center"
                      />
                      <span className="text-xs text-ink/35 font-semibold">min</span>
                    </div>
                  </div>
                  <Field label="Calorías" unit="kcal" value={kcal} onChange={setKcal} placeholder="400" />
                  <Field label="FC media" unit="bpm" value={avgHr} onChange={setAvgHr} placeholder="145" />
                </div>

                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nota opcional..."
                  className="w-full rounded-2xl bg-canvas-light border border-ink/8 px-4 py-3 text-sm outline-none" />

                <div className="flex items-center justify-between rounded-2xl bg-canvas-light px-4 py-3">
                  <span className="text-sm font-medium text-ink/50">Fecha</span>
                  <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)}
                    className="text-sm font-semibold text-ink bg-transparent outline-none text-right" />
                </div>
              </>
            )}

            <button type="button" onClick={handleSave} disabled={!type || saved}
              className={`w-full rounded-3xl py-4 text-base font-semibold transition-all ${
                saved
                  ? 'bg-moss text-white'
                  : 'bg-ink text-white active:scale-[0.98] disabled:opacity-30'
              }`}
            >
              {saved ? '¡Guardado! ✓' : isEditing ? 'Guardar cambios' : 'Guardar actividad'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
