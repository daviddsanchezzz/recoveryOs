import { Inject, Injectable } from '@nestjs/common';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../domain/sleep-repository.port';

@Injectable()
export class GetUserSleepUseCase {
  constructor(
    @Inject(SLEEP_REPOSITORY)
    private readonly repository: SleepRepositoryPort,
  ) {}

  execute(userId: string) {
    return this.repository.findByUser(userId);
  }
}
