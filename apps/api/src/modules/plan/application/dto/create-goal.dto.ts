import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  userId!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPct?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
