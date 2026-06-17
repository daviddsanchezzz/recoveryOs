import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class LogMealDto {
  @IsString()
  userId!: string;

  @Type(() => Date)
  @IsDate()
  consumedAt!: Date;

  @IsString()
  rawText!: string;

  @IsInt()
  @Min(0)
  calories!: number;

  @IsNumber()
  @Min(0)
  proteinGrams!: number;

  @IsNumber()
  @Min(0)
  carbsGrams!: number;

  @IsNumber()
  @Min(0)
  fatGrams!: number;
}

