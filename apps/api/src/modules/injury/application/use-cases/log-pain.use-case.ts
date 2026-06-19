import { Inject, Injectable } from '@nestjs/common';
import { InjuryLogEntity } from '../../domain/injury-log.entity';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';
import { LogPainDto } from '../dto/log-pain.dto';

@Injectable()
export class LogPainUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  execute(injuryId: string, input: LogPainDto) {
    const log = new InjuryLogEntity(
      crypto.randomUUID(),
      injuryId,
      input.userId,
      input.date,
      input.painLevel,
      input.didRehab,
      input.notes,
    );
    return this.repository.createLog(log);
  }
}
