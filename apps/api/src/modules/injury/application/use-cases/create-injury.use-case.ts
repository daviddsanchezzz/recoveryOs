import { Inject, Injectable } from '@nestjs/common';
import { InjuryEntity } from '../../domain/injury.entity';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';
import { CreateInjuryDto } from '../dto/create-injury.dto';

@Injectable()
export class CreateInjuryUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  execute(input: CreateInjuryDto) {
    const injury = new InjuryEntity(
      crypto.randomUUID(),
      input.userId,
      input.name,
      input.startDate,
      input.status ?? 'active',
      input.bodyPart,
      input.description,
    );
    return this.repository.createInjury(injury);
  }
}
