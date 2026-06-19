import { Inject, Injectable } from '@nestjs/common';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';

@Injectable()
export class GetUserInjuriesUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  execute(userId: string) {
    return this.repository.findInjuriesByUser(userId);
  }
}
