import { Inject, Injectable } from '@nestjs/common';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../../domain/strava-repository.port';
import { StravaTokenEntity } from '../../domain/strava-token.entity';
import { StravaApiClient } from '../../infrastructure/strava-api.client';

@Injectable()
export class HandleStravaCallbackUseCase {
  constructor(
    @Inject(STRAVA_REPOSITORY) private readonly repo: StravaRepositoryPort,
    private readonly api: StravaApiClient,
  ) {}

  async execute(userId: string, code: string): Promise<void> {
    const tokenData = await this.api.exchangeCode(code);

    const entity = new StravaTokenEntity(
      crypto.randomUUID(),
      userId,
      tokenData.access_token,
      tokenData.refresh_token,
      new Date(tokenData.expires_at * 1000),
      String(tokenData.athlete.id),
      null,
    );

    await this.repo.saveToken(entity);
  }
}
