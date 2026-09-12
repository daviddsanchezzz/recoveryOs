'use client';

import { useEffect, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { Portal } from './portal';
import { useRecoveryStore } from '../stores/recovery-store';
import { useNutritionStore } from '../stores/nutrition-store';
import { NutritionService } from '../lib/services';
import { toast } from '../stores/toast-store';
import { calculateBmr } from '../lib/bmr';

export function ConfiguracionScreen({ onClose }: { onClose: () => void }) {
  const weightEntries = useRecoveryStore((s) => s.weightEntries);
  const goal = useNutritionStore((s) => s.goal);

  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const latestWeight = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  useEffect(() => {
    NutritionService.fetchGoal()
      .then((g) => {
        setSex(g.sex);
        setHeight(g.heightCm ? String(g.heightCm) : '');
        setAge(g.age ? String(g.age) : '');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const heightNum = height ? Number(height) : null;
  const ageNum = age ? Number(age) : null;
  const bmr = calculateBmr({ sex, heightCm: heightNum, age: ageNum, weightKg: latestWeight?.weightKg });

  async function handleSave() {
    if (!sex || !heightNum || !ageNum) return;
    setSaving(true);
    try {
      await NutritionService.updateGoal({ sex, heightCm: heightNum, age: ageNum });
      toast.success('Datos personales guardados');
      onClose();
    } catch {
      toast.error('No se pudieron guardar los datos personales');
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!sex && !!heightNum && !!ageNum && !saving;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] bg-canvas flex flex-col animate-slide-up"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-ink/5 flex items-center justify-center">
              <Settings size={16} className="text-ink/60" />
            </div>
            <h1 className="text-2xl font-bold text-ink">Configuración</h1>
          </div>
          <button type="button" onClick={onClose}
            className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center">
            <X size={16} className="text-ink/60" />
          </button>
        </div>
        <p className="px-5 pb-5 text-sm text-ink/40 leading-relaxed">
          Con tus datos personales calculamos tu metabolismo basal, para que el balance de
          calorías de Hoy tenga en cuenta lo que gastas solo por vivir, no solo lo que te
          mueves.
        </p>

        <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Datos personales
          </p>
          <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">Sexo</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSex('male')}
                  className={`rounded-2xl py-3 text-sm font-semibold transition-all ${sex === 'male' ? 'bg-ink text-white' : 'bg-canvas text-ink/50'}`}
                >
                  Hombre
                </button>
                <button
                  type="button"
                  onClick={() => setSex('female')}
                  className={`rounded-2xl py-3 text-sm font-semibold transition-all ${sex === 'female' ? 'bg-ink text-white' : 'bg-canvas text-ink/50'}`}
                >
                  Mujer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">Altura (cm)</p>
                <input
                  type="number"
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink outline-none border border-ink/8"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">Edad</p>
                <input
                  type="number"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="30"
                  className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink outline-none border border-ink/8"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-canvas px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-ink/50">Peso (último registro)</span>
              <span className="text-sm font-semibold text-ink">
                {latestWeight ? `${latestWeight.weightKg.toFixed(1)} kg` : 'Sin registrar'}
              </span>
            </div>

            {loaded && !latestWeight && (
              <p className="text-xs text-ink/30">
                Registra tu peso desde Hoy para completar el cálculo.
              </p>
            )}

            {bmr != null && (
              <div className="rounded-2xl bg-moss-light px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-moss/70">Metabolismo basal</p>
                <p className="text-sm text-ink/80 mt-0.5">~{bmr.toLocaleString('es-ES')} kcal/día solo por vivir</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-30"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
