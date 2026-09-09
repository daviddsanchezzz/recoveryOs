import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @Length(1, 2000)
  message!: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
