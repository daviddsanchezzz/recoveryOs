import { Inject, Injectable } from '@nestjs/common';
import { SleepEntryEntity } from '../../domain/sleep-entry.entity';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../domain/sleep-repository.port';
import { LogSleepDto } from '../dto/log-sleep.dto';

@Injectable()
export class LogSleepUseCase {
  constructor(
    @Inject(SLEEP_REPOSITORY)
    private readonly repository: SleepRepositoryPort,
  ) {}

  execute(input: LogSleepDto) {
    const entry = new SleepEntryEntity(input.id ?? crypto.randomUUID(), input.userId, input.date, input.durationH, input.quality);
    return this.repository.create(entry);
  }
}
