import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LogPainDto {
  @IsString()
  userId!: string;

  @Type(() => Date)
  @IsDate()
  date!: Date;

  @IsInt()
  @Min(0)
  @Max(10)
  painLevel!: number;

  @IsBoolean()
  didRehab!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
