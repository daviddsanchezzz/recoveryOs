import { randomBytes } from 'node:crypto';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { CorosRepositoryPort } from '../domain/coros-repository.port';

export interface CorosOAuthProviderOptions {
  userId: string;
  repo: CorosRepositoryPort;
  redirectUri: string;
  /** Invoked synchronously while the SDK builds the authorization URL — connect phase only. */
  onAuthorizationUrl?: (url: string) => void;
  /** Already-persisted PKCE verifier for this attempt — callback phase only. */
  knownCodeVerifier?: string;
}

export function createCorosOAuthProvider(opts: CorosOAuthProviderOptions): OAuthClientProvider {
  const { userId, repo, redirectUri, onAuthorizationUrl, knownCodeVerifier } = opts;
  let stateForThisAttempt: string | undefined;

  return {
    get redirectUrl() {
      return redirectUri;
    },
    get clientMetadata(): OAuthClientMetadata {
      return {
        redirect_uris: [redirectUri],
        client_name: 'RecoveryOS',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };
    },
    // Only called by auth() when starting a brand-new authorization (connect
    // phase) — never on the authorizationCode-present callback exchange.
    async state(): Promise<string> {
      stateForThisAttempt = randomBytes(32).toString('base64url');
      await repo.createOAuthState(stateForThisAttempt, userId);
      return stateForThisAttempt;
    },
    async clientInformation() {
      const info = await repo.getOAuthClient();
      if (!info) return undefined;
      return { client_id: info.clientId, client_secret: info.clientSecret ?? undefined } as OAuthClientInformationMixed;
    },
    async saveClientInformation(info: OAuthClientInformationMixed) {
      await repo.saveOAuthClient(info.client_id, info.client_secret ?? null);
    },
    async tokens() {
      const stored = await repo.findTokenByUser(userId);
      if (!stored) return undefined;
      return {
        access_token: stored.accessToken,
        refresh_token: stored.refreshToken,
        token_type: 'Bearer',
      } as OAuthTokens;
    },
    async saveTokens(tokens: OAuthTokens) {
      const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 86_400) * 1000);
      let refreshToken = tokens.refresh_token;
      if (!refreshToken) {
        // RFC 6749 §6 does not require the server to return a new refresh_token on
        // every refresh — omission means "keep using the one you already have."
        const existing = await repo.findTokenByUser(userId);
        refreshToken = existing?.refreshToken ?? '';
      }
      await repo.saveToken(userId, {
        accessToken: tokens.access_token,
        refreshToken,
        expiresAt,
      });
    },
    async redirectToAuthorization(authorizationUrl: URL) {
      onAuthorizationUrl?.(authorizationUrl.toString());
    },
    async saveCodeVerifier(codeVerifier: string) {
      if (!stateForThisAttempt) {
        throw new Error('saveCodeVerifier called before state() — unexpected SDK call order');
      }
      await repo.saveCodeVerifierForState(stateForThisAttempt, codeVerifier);
    },
    async codeVerifier() {
      if (!knownCodeVerifier) {
        throw new Error('No code verifier available on this provider instance — was it built for the callback phase?');
      }
      return knownCodeVerifier;
    },
  };
}
