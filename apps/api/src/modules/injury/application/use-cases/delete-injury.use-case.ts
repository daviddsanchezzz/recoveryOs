import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';

@Injectable()
export class DeleteInjuryUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.deleteInjury(id, userId);
    if (!deleted) throw new NotFoundException('Injury not found');
  }
}
