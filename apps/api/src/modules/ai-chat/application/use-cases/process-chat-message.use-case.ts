import { Inject, Injectable } from '@nestjs/common';
import { LogActivityUseCase } from '../../../activity/application/use-cases/log-activity.use-case';
import { GetUserInjuriesUseCase } from '../../../injury/application/use-cases/get-user-injuries.use-case';
import { LogMealUseCase } from '../../../nutrition/application/use-cases/log-meal.use-case';
import { GetWeightSummaryUseCase } from '../../../weight/application/use-cases/get-weight-summary.use-case';
import { LogWeightUseCase } from '../../../weight/application/use-cases/log-weight.use-case';
import { AI_INTENT_PARSER, AiIntentParserPort } from '../../domain/ai-intent-parser.port';
import { ChatMessageDto } from '../dto/chat-message.dto';

@Injectable()
export class ProcessChatMessageUseCase {
  constructor(
    @Inject(AI_INTENT_PARSER)
    private readonly parser: AiIntentParserPort,
    private readonly logWeightUseCase: LogWeightUseCase,
    private readonly getWeightSummaryUseCase: GetWeightSummaryUseCase,
    private readonly getUserInjuriesUseCase: GetUserInjuriesUseCase,
    private readonly logMealUseCase: LogMealUseCase,
    private readonly logActivityUseCase: LogActivityUseCase,
  ) {}

  async execute(input: ChatMessageDto) {
    const parsed = await this.parser.parse({
      userId: input.userId,
      message: input.message,
      now: new Date(),
    });

    if (parsed.type === 'weight') {
      await this.logWeightUseCase.execute({
        userId: input.userId,
        date: parsed.payload.date,
        weightKg: parsed.payload.weightKg,
      });

      const summary = await this.getWeightSummaryUseCase.execute(input.userId);
      return {
        intent: parsed.type,
        reply: parsed.reply,
        record: summary.currentWeightKg,
      };
    }

    if (parsed.type === 'injury') {
      const injuries = await this.getUserInjuriesUseCase.execute(input.userId);
      return {
        intent: parsed.type,
        reply: parsed.reply,
        record: { activeCount: injuries.filter((i) => i.status === 'active').length },
      };
    }

    if (parsed.type === 'nutrition') {
      const record = await this.logMealUseCase.execute({
        userId: input.userId,
        consumedAt: parsed.payload.consumedAt,
        rawText: parsed.payload.rawText,
        calories: parsed.payload.calories,
        proteinGrams: parsed.payload.proteinGrams,
        carbsGrams: parsed.payload.carbsGrams,
        fatGrams: parsed.payload.fatGrams,
      });

      return {
        intent: parsed.type,
        reply: parsed.reply,
        record,
      };
    }

    if (parsed.type === 'activity') {
      const record = await this.logActivityUseCase.execute({
        userId: input.userId,
        type: parsed.payload.type,
        durationMin: parsed.payload.durationMin,
        distanceKm: parsed.payload.distanceKm,
        source: 'chat',
        performedAt: new Date(),
      });

      return {
        intent: parsed.type,
        reply: parsed.reply,
        record,
      };
    }

    return {
      intent: parsed.type,
      reply: parsed.reply,
      record: null,
    };
  }
}
