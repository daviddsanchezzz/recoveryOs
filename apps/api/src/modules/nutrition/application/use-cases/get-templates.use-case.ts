import { Injectable } from '@nestjs/common';
import { MealType } from '../../domain/meal-types';

export interface MealTemplate {
  id: string;
  name: string;
  mealType: MealType;
  description: string;
  caloriesEstimate: number;
  proteinEstimate: number;
}

const DEFAULT_TEMPLATES: MealTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Desayuno oficina',
    mealType: 'breakfast',
    description: 'Yogur con frutos secos y café',
    caloriesEstimate: 350,
    proteinEstimate: 15,
  },
  {
    id: 'tmpl-2',
    name: 'Plátano',
    mealType: 'snack',
    description: 'Plátano mediano',
    caloriesEstimate: 90,
    proteinEstimate: 1,
  },
  {
    id: 'tmpl-3',
    name: 'Tostada jamón',
    mealType: 'breakfast',
    description: 'Tostada con jamón serrano',
    caloriesEstimate: 280,
    proteinEstimate: 18,
  },
  {
    id: 'tmpl-4',
    name: 'Tostada fuet',
    mealType: 'breakfast',
    description: 'Tostada con fuet',
    caloriesEstimate: 320,
    proteinEstimate: 14,
  },
];

@Injectable()
export class GetTemplatesUseCase {
  execute(): MealTemplate[] {
    return DEFAULT_TEMPLATES;
  }
}
