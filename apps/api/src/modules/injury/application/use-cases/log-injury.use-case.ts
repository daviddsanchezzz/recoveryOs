import { Inject, Injectable } from '@nestjs/common';
import { InjuryEntryEntity } from '../../domain/injury-entry.entity';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';
import { LogInjuryDto } from '../dto/log-injury.dto';

@Injectable()
export class LogInjuryUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  execute(input: LogInjuryDto) {
    const entry = new InjuryEntryEntity(
      crypto.randomUUID(),
      input.userId,
      input.date,
      input.walkingPain,
      input.stiffness,
      input.swelling,
      input.rehabCompleted,
      input.notes,
    );
    return this.repository.create(entry);
  }
}

