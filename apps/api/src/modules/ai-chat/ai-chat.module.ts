import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { HealthMetricsModule } from '../health-metrics/health-metrics.module';
import { InjuryModule } from '../injury/injury.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { SleepModule } from '../sleep/sleep.module';
import { WeightModule } from '../weight/weight.module';
import { HealthContextService } from './application/services/health-context.service';
import { ProcessChatMessageUseCase } from './application/use-cases/process-chat-message.use-case';
import { HEALTH_AGENT } from './domain/health-agent.port';
import { OpenAiHealthAgent } from './infrastructure/openai-health-agent';
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
    HealthContextService,
    {
      provide: HEALTH_AGENT,
      useFactory: () => new OpenAiHealthAgent(),
    },
  ],
})
export class AiChatModule {}
