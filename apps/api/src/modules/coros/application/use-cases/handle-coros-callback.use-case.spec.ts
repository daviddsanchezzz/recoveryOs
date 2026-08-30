import { HandleCorosCallbackUseCase } from './handle-coros-callback.use-case';
import { CorosRepositoryPort } from '../../domain/coros-repository.port';
import { CorosMcpClient } from '../../infrastructure/coros-mcp.client';

describe('HandleCorosCallbackUseCase', () => {
  it('completes authorization for the user resolved from the state', async () => {
    const repo = {
      consumeOAuthState: jest.fn().mockResolvedValue({ userId: 'user-1', codeVerifier: 'verifier-abc' }),
    } as unknown as CorosRepositoryPort;
    const mcpClient = { completeAuthorization: jest.fn() } as unknown as CorosMcpClient;
    const useCase = new HandleCorosCallbackUseCase(repo, mcpClient);

    await useCase.execute('state-xyz', 'auth-code');

    expect(repo.consumeOAuthState).toHaveBeenCalledWith('state-xyz');
    expect(mcpClient.completeAuthorization).toHaveBeenCalledWith('user-1', 'auth-code', 'verifier-abc');
  });

  it('rejects an unknown or expired state', async () => {
    const repo = { consumeOAuthState: jest.fn().mockResolvedValue(null) } as unknown as CorosRepositoryPort;
    const mcpClient = { completeAuthorization: jest.fn() } as unknown as CorosMcpClient;
    const useCase = new HandleCorosCallbackUseCase(repo, mcpClient);

    await expect(useCase.execute('bad-state', 'auth-code')).rejects.toThrow('Invalid or expired');
    expect(mcpClient.completeAuthorization).not.toHaveBeenCalled();
  });

  it('rejects a state that was never given a code verifier', async () => {
    const repo = {
      consumeOAuthState: jest.fn().mockResolvedValue({ userId: 'user-1', codeVerifier: null }),
    } as unknown as CorosRepositoryPort;
    const mcpClient = { completeAuthorization: jest.fn() } as unknown as CorosMcpClient;
    const useCase = new HandleCorosCallbackUseCase(repo, mcpClient);

    await expect(useCase.execute('state-xyz', 'auth-code')).rejects.toThrow('PKCE verifier');
  });
});
