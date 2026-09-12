import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateGoalDto {
  // Always overwritten by the controller with the session's user id — optional here
  // so a client that (correctly) omits it doesn't fail validation.
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  caloriesTarget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  proteinTarget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  waterTargetMl?: number;

  @IsOptional()
  @IsIn(['male', 'female'])
  sex?: 'male' | 'female';

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  age?: number;
}
