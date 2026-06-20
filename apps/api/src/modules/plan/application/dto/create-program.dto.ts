import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  userId!: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  totalWeeks!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  currentWeek?: number;
}
