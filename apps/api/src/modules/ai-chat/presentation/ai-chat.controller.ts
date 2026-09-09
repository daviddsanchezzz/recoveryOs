import { Body, Controller, ForbiddenException, Get, Inject, Post, Req } from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { ChatMessageDto } from '../application/dto/chat-message.dto';
import { HealthAdviceDto } from '../application/dto/health-advice.dto';
import { GenerateHealthAdviceUseCase } from '../application/use-cases/generate-health-advice.use-case';
import { ProcessChatMessageUseCase } from '../application/use-cases/process-chat-message.use-case';

@Controller('chat')
export class AiChatController {
  constructor(
    private readonly processChatMessageUseCase: ProcessChatMessageUseCase,
    private readonly generateHealthAdviceUseCase: GenerateHealthAdviceUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Post()
  create(@Body() body: ChatMessageDto) {
    return this.processChatMessageUseCase.execute(body);
  }

  @Post('advice')
  async advise(@Body() body: HealthAdviceDto, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.generateHealthAdviceUseCase.execute({ ...body, userId: session.user.id });
  }

  @Get('status')
  status() {
    return {
      configured: Boolean(process.env.OPENAI_API_KEY),
      provider: process.env.OPENAI_API_KEY ? 'openai' : 'local',
      model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL ?? 'gpt-5.4-mini' : null,
    };
  }
}
