import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { WEIGHT_REPOSITORY, WeightRepositoryPort } from '../../domain/weight-repository.port';

@Injectable()
export class DeleteWeightUseCase {
  constructor(
    @Inject(WEIGHT_REPOSITORY)
    private readonly repository: WeightRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.delete(id, userId);
    if (!deleted) throw new NotFoundException(`Weight entry not found`);
  }
}
