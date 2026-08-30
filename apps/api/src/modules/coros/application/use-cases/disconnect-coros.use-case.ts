import { Inject, Injectable } from '@nestjs/common';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../../domain/coros-repository.port';

@Injectable()
export class DisconnectCorosUseCase {
  constructor(@Inject(COROS_REPOSITORY) private readonly repo: CorosRepositoryPort) {}

  execute(userId: string): Promise<void> {
    return this.repo.deleteToken(userId);
  }
}
