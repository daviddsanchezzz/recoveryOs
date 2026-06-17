import { Body, Controller, Post } from '@nestjs/common';
import { ChatMessageDto } from '../application/dto/chat-message.dto';
import { ProcessChatMessageUseCase } from '../application/use-cases/process-chat-message.use-case';

@Controller('chat')
export class AiChatController {
  constructor(private readonly processChatMessageUseCase: ProcessChatMessageUseCase) {}

  @Post()
  create(@Body() body: ChatMessageDto) {
    return this.processChatMessageUseCase.execute(body);
  }
}

