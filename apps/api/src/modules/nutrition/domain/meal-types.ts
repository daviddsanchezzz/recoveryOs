export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'extra';
export type Quality = 'low' | 'medium' | 'high';
export type Confidence = 'low' | 'medium' | 'high';
export type MealSource = 'manual' | 'ai' | 'template';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'extra'];
export const REQUIRED_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
