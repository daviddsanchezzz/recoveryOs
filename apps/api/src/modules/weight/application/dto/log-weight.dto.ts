import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LogWeightDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  userId!: string;

  @Type(() => Date)
  @IsDate()
  date!: Date;

  @IsNumber()
  @Min(1)
  weightKg!: number;
}

