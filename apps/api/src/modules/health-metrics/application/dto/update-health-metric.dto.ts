import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const HEALTH_METRIC_SOURCES = ['manual', 'apple_health', 'coros', 'garmin', 'mock'] as const;

export class UpdateHealthMetricDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  steps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  activeCalories?: number;

  @IsOptional()
  @IsString()
  @IsIn(HEALTH_METRIC_SOURCES)
  source?: (typeof HEALTH_METRIC_SOURCES)[number];
}
