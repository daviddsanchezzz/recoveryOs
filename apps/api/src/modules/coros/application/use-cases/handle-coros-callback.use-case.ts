import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../../domain/coros-repository.port';
import { CorosMcpClient } from '../../infrastructure/coros-mcp.client';

@Injectable()
export class HandleCorosCallbackUseCase {
  constructor(
    @Inject(COROS_REPOSITORY) private readonly repo: CorosRepositoryPort,
    private readonly mcpClient: CorosMcpClient,
  ) {}

  async execute(state: string, code: string): Promise<void> {
    const pending = await this.repo.consumeOAuthState(state);
    if (!pending) throw new UnauthorizedException('Invalid or expired COROS authorization state');
    if (!pending.codeVerifier) throw new UnauthorizedException('COROS authorization attempt is missing its PKCE verifier');

    await this.mcpClient.completeAuthorization(pending.userId, code, pending.codeVerifier);
  }
}
