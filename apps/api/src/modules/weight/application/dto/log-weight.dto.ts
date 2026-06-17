import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsString, Min } from 'class-validator';

export class LogWeightDto {
  @IsString()
  userId!: string;

  @Type(() => Date)
  @IsDate()
  date!: Date;

  @IsNumber()
  @Min(1)
  weightKg!: number;
}

