import { Inject, Injectable } from '@nestjs/common';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';

@Injectable()
export class DeleteInjuryLogUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  execute(logId: string) {
    return this.repository.deleteLog(logId);
  }
}
