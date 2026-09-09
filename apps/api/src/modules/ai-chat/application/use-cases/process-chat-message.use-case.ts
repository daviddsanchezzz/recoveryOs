import { Inject, Injectable } from '@nestjs/common';
import { LogActivityUseCase } from '../../../activity/application/use-cases/log-activity.use-case';
import { GetUserInjuriesUseCase } from '../../../injury/application/use-cases/get-user-injuries.use-case';
import { LogPainUseCase } from '../../../injury/application/use-cases/log-pain.use-case';
import { LogMealUseCase } from '../../../nutrition/application/use-cases/log-meal.use-case';
import { GetWeightSummaryUseCase } from '../../../weight/application/use-cases/get-weight-summary.use-case';
import { LogWeightUseCase } from '../../../weight/application/use-cases/log-weight.use-case';
import { HEALTH_AGENT, HealthAgentPort } from '../../domain/health-agent.port';
import { ChatMessageDto } from '../dto/chat-message.dto';
import { HealthContextService } from '../services/health-context.service';

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

@Injectable()
export class ProcessChatMessageUseCase {
  constructor(
    @Inject(HEALTH_AGENT) private readonly agent: HealthAgentPort,
    private readonly healthContext: HealthContextService,
    private readonly logWeightUseCase: LogWeightUseCase,
    private readonly getWeightSummaryUseCase: GetWeightSummaryUseCase,
    private readonly getUserInjuriesUseCase: GetUserInjuriesUseCase,
    private readonly logPainUseCase: LogPainUseCase,
    private readonly logMealUseCase: LogMealUseCase,
    private readonly logActivityUseCase: LogActivityUseCase,
  ) {}

  async execute(input: ChatMessageDto & { userId: string }) {
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const context = await this.healthContext.build(input.userId, date);
    const parsed = await this.agent.respond({
      message: input.message,
      date,
      context,
    });

    if (parsed.intent === 'advice' || parsed.intent === 'clarification') {
      return { intent: parsed.intent, reply: parsed.reply, record: null, provider: 'openai' };
    }

    if (parsed.intent === 'weight') {
      await this.logWeightUseCase.execute({
        userId: input.userId,
        date: parsed.payload.date,
        weightKg: parsed.payload.weightKg,
      });

      const summary = await this.getWeightSummaryUseCase.execute(input.userId);
      return {
        intent: parsed.intent,
        reply: parsed.reply,
        record: summary.currentWeightKg,
        provider: 'openai',
      };
    }

    if (parsed.intent === 'injury') {
      const injuries = await this.getUserInjuriesUseCase.execute(input.userId);
      const active = injuries.filter((injury) => injury.status !== 'resolved');
      const requestedName = parsed.payload.injuryName ? normalized(parsed.payload.injuryName) : null;
      const injury = requestedName
        ? active.find((candidate) => normalized(candidate.name).includes(requestedName))
        : active.length === 1 ? active[0] : null;

      if (!injury) {
        return {
          intent: 'clarification',
          reply: active.length
            ? `¿A qué lesión te refieres: ${active.map((item) => item.name).join(', ')}?`
            : 'No tienes ninguna lesión activa. ¿Quieres crear una primero?',
          record: null,
          provider: 'openai',
        };
      }

      const record = await this.logPainUseCase.execute(injury.id, {
        userId: input.userId,
        date: parsed.payload.date,
        painLevel: parsed.payload.painLevel,
        didRehab: parsed.payload.didRehab,
        notes: parsed.payload.notes,
      });
      return {
        intent: parsed.intent,
        reply: parsed.reply,
        record,
        provider: 'openai',
      };
    }

    if (parsed.intent === 'nutrition') {
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
        intent: parsed.intent,
        reply: parsed.reply,
        record,
        provider: 'openai',
      };
    }

    if (parsed.intent === 'activity') {
      const record = await this.logActivityUseCase.execute({
        userId: input.userId,
        type: parsed.payload.type,
        durationMin: parsed.payload.durationMin,
        distanceKm: parsed.payload.distanceKm,
        notes: parsed.payload.notes,
        source: 'chat',
        performedAt: parsed.payload.performedAt,
      });

      return {
        intent: parsed.intent,
        reply: parsed.reply,
        record,
        provider: 'openai',
      };
    }
  }
}
