import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateGoalDto {
  @IsString()
  userId!: string;

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
}
