import { Body, Controller, ForbiddenException, Get, Inject, Post, Req } from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { getOpenAiApiKey, getOpenAiModel } from '../../../shared/infrastructure/openai/openai-config';
import { ChatMessageDto } from '../application/dto/chat-message.dto';
import { ProcessChatMessageUseCase } from '../application/use-cases/process-chat-message.use-case';

@Controller('chat')
export class AiChatController {
  constructor(
    private readonly processChatMessageUseCase: ProcessChatMessageUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Post()
  async create(@Body() body: ChatMessageDto, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.processChatMessageUseCase.execute({ ...body, userId: session.user.id });
  }

  @Get('status')
  status() {
    const configured = Boolean(getOpenAiApiKey());
    return {
      configured,
      provider: configured ? 'openai' : 'unavailable',
      model: configured ? getOpenAiModel() : null,
    };
  }
}
