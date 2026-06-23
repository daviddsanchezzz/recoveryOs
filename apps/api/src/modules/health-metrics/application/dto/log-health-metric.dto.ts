import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const HEALTH_METRIC_SOURCES = ['manual', 'apple_health', 'coros', 'garmin', 'mock'] as const;

export class LogHealthMetricDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @Type(() => Date)
  @IsDate()
  date!: Date;

  @IsInt()
  @Min(0)
  steps!: number;

  @IsInt()
  @Min(0)
  activeCalories!: number;

  @IsOptional()
  @IsString()
  @IsIn(HEALTH_METRIC_SOURCES)
  source?: (typeof HEALTH_METRIC_SOURCES)[number];
}
