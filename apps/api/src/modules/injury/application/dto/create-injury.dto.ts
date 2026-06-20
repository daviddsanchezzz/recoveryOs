import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateInjuryDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsString()
  userId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  bodyPart?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @IsOptional()
  @IsIn(['active', 'recovering', 'resolved'])
  status?: 'active' | 'recovering' | 'resolved';
}
