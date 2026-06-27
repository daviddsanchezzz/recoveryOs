import { IsOptional, IsString } from 'class-validator';

export class ParseMealDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD, defaults to today
}
