import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../domain/sleep-repository.port';
import { UpdateSleepDto } from '../dto/update-sleep.dto';

@Injectable()
export class UpdateSleepUseCase {
  constructor(
    @Inject(SLEEP_REPOSITORY)
    private readonly repository: SleepRepositoryPort,
  ) {}

  async execute(id: string, userId: string, input: UpdateSleepDto) {
    const result = await this.repository.update(id, userId, input);
    if (!result) throw new NotFoundException('Sleep entry not found');
    return result;
  }
}
