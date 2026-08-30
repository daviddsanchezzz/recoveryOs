import { IsDateString, IsOptional } from 'class-validator';

export class SyncCorosDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
