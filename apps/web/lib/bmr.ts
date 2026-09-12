// Mifflin-St Jeor equation — kcal/day spent just by being alive (basal metabolic rate).
export function calculateBmr(input: {
  sex: 'male' | 'female' | null | undefined;
  heightCm: number | null | undefined;
  age: number | null | undefined;
  weightKg: number | null | undefined;
}): number | null {
  const { sex, heightCm, age, weightKg } = input;
  if (!sex || !heightCm || !age || !weightKg) return null;

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}
