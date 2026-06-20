import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class LogSleepDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsString()
  userId!: string;

  @Type(() => Date)
  @IsDate()
  date!: Date;

  @IsNumber()
  @Min(0)
  @Max(24)
  durationH!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  quality!: number;
}
