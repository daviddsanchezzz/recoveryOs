import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';
import { UpdateInjuryDto } from '../dto/update-injury.dto';

@Injectable()
export class UpdateInjuryUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  async execute(id: string, userId: string, input: UpdateInjuryDto) {
    const result = await this.repository.updateInjury(id, userId, input);
    if (!result) throw new NotFoundException('Injury not found');
    return result;
  }
}
