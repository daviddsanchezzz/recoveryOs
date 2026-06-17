import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LogActivityDto {
  @IsString()
  userId!: string;

  @IsString()
  type!: string;

  @IsInt()
  @Min(1)
  durationMin!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @IsString()
  source!: string;

  @Type(() => Date)
  @IsDate()
  performedAt!: Date;
}

