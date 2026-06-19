import { Inject, Injectable } from '@nestjs/common';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../domain/sleep-repository.port';
import { UpdateSleepDto } from '../dto/update-sleep.dto';

@Injectable()
export class UpdateSleepUseCase {
  constructor(
    @Inject(SLEEP_REPOSITORY)
    private readonly repository: SleepRepositoryPort,
  ) {}

  execute(id: string, input: UpdateSleepDto) {
    return this.repository.update(id, input);
  }
}
