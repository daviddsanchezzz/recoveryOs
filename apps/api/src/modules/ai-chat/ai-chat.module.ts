import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { InjuryModule } from '../injury/injury.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { WeightModule } from '../weight/weight.module';
import { ProcessChatMessageUseCase } from './application/use-cases/process-chat-message.use-case';
import { AI_INTENT_PARSER } from './domain/ai-intent-parser.port';
import { MockAiIntentParser } from './infrastructure/mock-ai-intent-parser';
import { AiChatController } from './presentation/ai-chat.controller';

@Module({
  imports: [WeightModule, InjuryModule, NutritionModule, ActivityModule],
  controllers: [AiChatController],
  providers: [
    ProcessChatMessageUseCase,
    MockAiIntentParser,
    {
      provide: AI_INTENT_PARSER,
      useExisting: MockAiIntentParser,
    },
  ],
})
export class AiChatModule {}
