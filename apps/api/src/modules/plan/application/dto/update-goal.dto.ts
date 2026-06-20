import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPct?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
