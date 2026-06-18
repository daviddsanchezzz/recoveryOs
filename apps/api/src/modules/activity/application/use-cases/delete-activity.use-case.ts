import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../domain/activity-repository.port';

@Injectable()
export class DeleteActivityUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    await this.repository.deleteById(id);
  }
}
