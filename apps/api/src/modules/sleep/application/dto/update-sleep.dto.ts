import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSleepDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  durationH?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  quality?: number;
}
