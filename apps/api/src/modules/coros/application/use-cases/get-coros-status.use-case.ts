import { Inject, Injectable } from '@nestjs/common';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../../domain/coros-repository.port';

export type CorosStatus = {
  connected: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  syncError: string | null;
};

@Injectable()
export class GetCorosStatusUseCase {
  constructor(@Inject(COROS_REPOSITORY) private readonly repo: CorosRepositoryPort) {}

  async execute(userId: string): Promise<CorosStatus> {
    const token = await this.repo.findTokenByUser(userId);
    return {
      connected: !!token,
      lastSyncAt: token?.lastSyncAt?.toISOString() ?? null,
      syncStatus: token?.syncStatus ?? null,
      syncError: token?.syncError ?? null,
    };
  }
}
