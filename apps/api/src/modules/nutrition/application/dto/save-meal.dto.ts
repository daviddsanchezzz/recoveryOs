import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Confidence, MealSource, MealType, Quality } from '../../domain/meal-types';

export class SaveMealDto {
  @IsString()
  userId!: string;

  @IsString()
  date!: string; // YYYY-MM-DD

  @IsEnum(['breakfast', 'lunch', 'snack', 'dinner', 'extra'])
  mealType!: MealType;

  @IsString()
  rawText!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  caloriesEstimate!: number;

  @IsNumber()
  @Min(0)
  proteinEstimate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbsEstimate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fatEstimate?: number;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  quality?: Quality;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  confidence?: Confidence;

  @IsOptional()
  @IsEnum(['manual', 'ai', 'template'])
  source?: MealSource;
}
