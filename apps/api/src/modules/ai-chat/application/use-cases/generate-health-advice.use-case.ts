import { Inject, Injectable } from '@nestjs/common';
import { HEALTH_ADVISOR, HealthAdviceResponse, HealthAdvisorPort } from '../../domain/health-advisor.port';
import { LocalHealthAdvisor } from '../../infrastructure/local-health-advisor';
import { HealthAdviceDto } from '../dto/health-advice.dto';
import { HealthContextService } from '../services/health-context.service';

@Injectable()
export class GenerateHealthAdviceUseCase {
  constructor(
    private readonly contextService: HealthContextService,
    @Inject(HEALTH_ADVISOR) private readonly advisor: HealthAdvisorPort,
    private readonly localAdvisor: LocalHealthAdvisor,
  ) {}

  async execute(input: HealthAdviceDto & { userId: string }): Promise<HealthAdviceResponse> {
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const context = await this.contextService.build(input.userId, date);

    try {
      return {
        reply: await this.advisor.advise({ message: input.message, context }),
        provider: this.advisor.provider,
        date,
        missingData: context.missingData,
      };
    } catch (error) {
      if (this.advisor.provider === 'local') throw error;
      return {
        reply: await this.localAdvisor.advise({ message: input.message, context }),
        provider: 'local',
        date,
        missingData: context.missingData,
      };
    }
  }
}
