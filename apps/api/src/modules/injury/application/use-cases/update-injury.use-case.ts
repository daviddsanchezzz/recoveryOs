import { Inject, Injectable } from '@nestjs/common';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';
import { UpdateInjuryDto } from '../dto/update-injury.dto';

@Injectable()
export class UpdateInjuryUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  execute(id: string, input: UpdateInjuryDto) {
    return this.repository.updateInjury(id, input);
  }
}
