import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../domain/sleep-repository.port';

@Injectable()
export class DeleteSleepUseCase {
  constructor(
    @Inject(SLEEP_REPOSITORY)
    private readonly repository: SleepRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.delete(id, userId);
    if (!deleted) throw new NotFoundException('Sleep entry not found');
  }
}
