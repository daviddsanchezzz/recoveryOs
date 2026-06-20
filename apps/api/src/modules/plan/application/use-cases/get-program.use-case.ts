import { Inject, Injectable } from '@nestjs/common';
import { ProgramEntity } from '../../domain/program.entity';
import { PLAN_REPOSITORY, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class GetProgramUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(userId: string): Promise<ProgramEntity | null> {
    return this.repo.findActiveProgram(userId);
  }
}
