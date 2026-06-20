import { Inject, Injectable } from '@nestjs/common';
import { CreateProgramDto } from '../dto/create-program.dto';
import { ProgramEntity } from '../../domain/program.entity';
import { PLAN_REPOSITORY, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class CreateProgramUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(input: CreateProgramDto): Promise<ProgramEntity> {
    const program = new ProgramEntity(
      crypto.randomUUID(),
      input.userId,
      input.name,
      input.totalWeeks,
      input.currentWeek ?? 1,
      true,
      new Date(),
    );
    return this.repo.createProgram(program);
  }
}
