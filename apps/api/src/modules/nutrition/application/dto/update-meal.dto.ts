import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MealType, Quality } from '../../domain/meal-types';

export class UpdateMealDto {
  @IsOptional()
  @IsEnum(['breakfast', 'lunch', 'snack', 'dinner', 'extra'])
  mealType?: MealType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  caloriesEstimate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinEstimate?: number;

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
}
