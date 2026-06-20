import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class LogWeightDto {
  @IsOptional()
  @IsUUID('4')
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

