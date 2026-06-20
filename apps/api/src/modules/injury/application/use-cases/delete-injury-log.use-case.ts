import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';

@Injectable()
export class DeleteInjuryLogUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  async execute(logId: string, userId: string): Promise<void> {
    const deleted = await this.repository.deleteLog(logId, userId);
    if (!deleted) throw new NotFoundException('Injury log not found');
  }
}
