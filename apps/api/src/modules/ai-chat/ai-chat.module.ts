import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { HealthMetricsModule } from '../health-metrics/health-metrics.module';
import { InjuryModule } from '../injury/injury.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { SleepModule } from '../sleep/sleep.module';
import { WeightModule } from '../weight/weight.module';
import { HealthContextService } from './application/services/health-context.service';
import { GenerateHealthAdviceUseCase } from './application/use-cases/generate-health-advice.use-case';
import { ProcessChatMessageUseCase } from './application/use-cases/process-chat-message.use-case';
import { HEALTH_ADVISOR } from './domain/health-advisor.port';
import { LocalHealthAdvisor } from './infrastructure/local-health-advisor';
import { AI_INTENT_PARSER } from './domain/ai-intent-parser.port';
import { MockAiIntentParser } from './infrastructure/mock-ai-intent-parser';
import { OpenAiHealthAdvisor } from './infrastructure/openai-health-advisor';
import { AiChatController } from './presentation/ai-chat.controller';

@Module({
  imports: [
    WeightModule,
    AuthModule,
    InjuryModule,
    NutritionModule,
    ActivityModule,
    SleepModule,
    HealthMetricsModule,
  ],
  controllers: [AiChatController],
  providers: [
    ProcessChatMessageUseCase,
    GenerateHealthAdviceUseCase,
    HealthContextService,
    LocalHealthAdvisor,
    MockAiIntentParser,
    {
      provide: AI_INTENT_PARSER,
      useExisting: MockAiIntentParser,
    },
    {
      provide: HEALTH_ADVISOR,
      inject: [LocalHealthAdvisor],
      useFactory: (localAdvisor: LocalHealthAdvisor) =>
        process.env.OPENAI_API_KEY ? new OpenAiHealthAdvisor() : localAdvisor,
    },
  ],
})
export class AiChatModule {}
