import { Inject, Injectable } from '@nestjs/common';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';

@Injectable()
export class DeleteInjuryUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  execute(id: string) {
    return this.repository.deleteInjury(id);
  }
}
