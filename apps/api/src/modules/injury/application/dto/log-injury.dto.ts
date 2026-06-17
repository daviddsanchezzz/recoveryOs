import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LogInjuryDto {
  @IsString()
  userId!: string;

  @Type(() => Date)
  @IsDate()
  date!: Date;

  @IsInt()
  @Min(0)
  @Max(10)
  walkingPain!: number;

  @IsInt()
  @Min(0)
  @Max(10)
  stiffness!: number;

  @IsBoolean()
  swelling!: boolean;

  @IsBoolean()
  rehabCompleted!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

