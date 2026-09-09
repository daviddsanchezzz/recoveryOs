import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateInjuryDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  bodyPart?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  startDate?: Date;

  @IsOptional() @IsIn(['active', 'recovering', 'resolved'])
  status?: 'active' | 'recovering' | 'resolved';

  @IsOptional() @IsString()
  phaseLabel?: string | null;

  @IsOptional() @Type(() => Date) @IsDate()
  phaseStartDate?: Date | null;

  @IsOptional() @IsInt() @Min(1)
  phaseTargetSessions?: number | null;
}
