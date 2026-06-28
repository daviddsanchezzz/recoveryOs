'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, UtensilsCrossed, Loader2, ChevronDown } from 'lucide-react';
import { Portal } from './portal';
import { NutritionService } from '../lib/services';
import { useNutritionStore } from '../stores/nutrition-store';
import { useSessionStore } from '../stores/session-store';
import type { NutritionTemplate, MealType, ParsedMealProposal, Quality } from '../stores/nutrition-store';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch:     'Comida',
  snack:     'Merienda / Snack',
  dinner:    'Cena',
  extra:     'Extra',
};

const QUALITY_LABELS: Record<Quality, string> = {
  low:    'Baja',
  medium: 'Media',
  high:   'Alta',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  low:    'text-ember',
  medium: 'text-sand',
  high:   'text-moss',
};

interface AddMealSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
  onSaved?: () => void;
}

export function AddMealSheet({ isOpen, onClose, defaultDate, onSaved }: AddMealSheetProps) {
  const userId    = useSessionStore((s) => s.user?.id);
  const templates = useNutritionStore((s) => s.templates);

  const [text,        setText]        = useState('');
  const [loading,     setLoading]     = useState(false);
  const [proposal,    setProposal]    = useState<ParsedMealProposal | null>(null);
  const [mealType,    setMealType]    = useState<MealType>('snack');
  const [calories,    setCalories]    = useState('');
  const [protein,     setProtein]     = useState('');
  const [quality,     setQuality]     = useState<Quality>('medium');
  const [saved,       setSaved]       = useState(false);
  const [isTemplate,  setIsTemplate]  = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setProposal(null);
      setCalories('');
      setProtein('');
      setMealType('snack');
      setQuality('medium');
      setSaved(false);
      setIsTemplate(false);
      if (templates.length === 0) {
        NutritionService.fetchTemplates().catch(() => {});
      }
    }
  }, [isOpen]);

  async function handleEstimate() {
    if (!text.trim()) return;
    setLoading(true);
    setIsTemplate(false);
    try {
      const result = await NutritionService.parseMeal(text.trim(), defaultDate);
      setProposal(result);
      setMealType(result.mealType);
      setCalories(String(result.caloriesEstimate));
      setProtein(String(result.proteinEstimate));
      setQuality(result.quality);
    } catch {
      // toast already handled in service
    } finally {
      setLoading(false);
    }
  }

  function applyTemplate(tmpl: NutritionTemplate) {
    setText(tmpl.description);
    setMealType(tmpl.mealType);
    setCalories(String(tmpl.caloriesEstimate));
    setProtein(String(tmpl.proteinEstimate));
    setIsTemplate(true);
    setProposal({
      mealType:         tmpl.mealType,
      description:      tmpl.description,
      rawText:          tmpl.description,
      caloriesEstimate: tmpl.caloriesEstimate,
      proteinEstimate:  tmpl.proteinEstimate,
      carbsEstimate:    0,
      fatEstimate:      0,
      quality:          'medium',
      confidence:       'medium',
      explanation:      'Plantilla predefinida.',
    });
    setQuality('medium');
  }

  async function handleSave() {
    if (!userId || !calories || !protein) return;
    setSaved(true);
    try {
      await NutritionService.saveMeal({
        userId,
        date:             defaultDate,
        mealType,
        rawText:          text.trim() || (proposal?.rawText ?? ''),
        description:      proposal?.description,
        caloriesEstimate: parseInt(calories, 10),
        proteinEstimate:  parseFloat(protein),
        carbsEstimate:    proposal?.carbsEstimate,
        fatEstimate:      proposal?.fatEstimate,
        quality,
        confidence:       proposal?.confidence ?? 'medium',
        source:           isTemplate ? 'template' : proposal ? 'ai' : 'manual',
      });
      onSaved?.();
      setTimeout(onClose, 600);
    } catch {
      setSaved(false);
    }
  }

  if (!isOpen) return null;

  const canSave  = !!calories && !!protein && !saved;
  const hasInput = text.trim().length > 0;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-4xl max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={18} className="text-moss" />
            <h2 className="text-lg font-bold text-ink">Añadir comida</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-canvas"
          >
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        <div className="px-5 space-y-4 pb-2">
          {/* Quick templates */}
          {templates.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 mb-2">
                Accesos rápidos
              </p>
              <div className="flex gap-2 flex-wrap">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="px-3 py-1.5 rounded-xl bg-canvas text-xs font-medium text-ink/70 active:scale-95 transition-transform"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text input */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 mb-2">
              ¿Qué has comido?
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="He comido un tupper de fideuá con algo de marisco y una bolsa de palitos..."
              rows={3}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink placeholder:text-ink/30 outline-none resize-none"
            />
          </div>

          {/* Estimate button */}
          <button
            type="button"
            onClick={handleEstimate}
            disabled={!hasInput || loading}
            className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-30 flex items-center justify-center gap-2 transition-opacity active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Estimando...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Estimar con IA
              </>
            )}
          </button>

          {/* Proposal result */}
          {proposal && (
            <div className="rounded-2xl bg-canvas p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-ink leading-snug">{proposal.description}</p>
                <span className={`text-[10px] font-medium ${CONFIDENCE_COLORS[proposal.confidence]}`}>
                  Confianza{' '}
                  {proposal.confidence === 'high'
                    ? 'alta'
                    : proposal.confidence === 'medium'
                      ? 'media'
                      : 'baja'}
                </span>
              </div>

              {proposal.explanation && (
                <p className="text-xs text-ink/50 leading-relaxed">{proposal.explanation}</p>
              )}

              {/* Editable meal type */}
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5">
                <span className="text-xs font-medium text-ink/50">Tipo</span>
                <div className="relative">
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    className="text-xs font-semibold text-ink bg-transparent outline-none appearance-none pr-4"
                  >
                    {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((t) => (
                      <option key={t} value={t}>{MEAL_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
                </div>
              </div>

              {/* Editable kcal */}
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5">
                <span className="text-xs font-medium text-ink/50">Calorías</span>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-16 text-xs font-semibold text-ink bg-transparent outline-none text-right"
                  />
                  <span className="text-[10px] text-ink/40">kcal</span>
                </div>
              </div>

              {/* Editable protein */}
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5">
                <span className="text-xs font-medium text-ink/50">Proteína</span>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-16 text-xs font-semibold text-ink bg-transparent outline-none text-right"
                  />
                  <span className="text-[10px] text-ink/40">g</span>
                </div>
              </div>

              {/* Editable quality */}
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5">
                <span className="text-xs font-medium text-ink/50">Calidad</span>
                <div className="relative">
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as Quality)}
                    className="text-xs font-semibold text-ink bg-transparent outline-none appearance-none pr-4"
                  >
                    {(Object.keys(QUALITY_LABELS) as Quality[]).map((q) => (
                      <option key={q} value={q}>{QUALITY_LABELS[q]}</option>
                    ))}
                  </select>
                  <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          {(proposal || (calories && protein)) && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="w-full rounded-2xl bg-moss py-4 text-sm font-semibold text-white disabled:opacity-30 transition-opacity active:scale-[0.98]"
            >
              {saved ? 'Guardando... ✓' : 'Guardar comida'}
            </button>
          )}
        </div>
      </div>
    </Portal>
  );
}
