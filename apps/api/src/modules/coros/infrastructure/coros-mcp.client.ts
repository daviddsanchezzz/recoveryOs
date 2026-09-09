import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../domain/coros-repository.port';
import { createCorosOAuthProvider } from './coros-oauth-provider';

// mcp.coros.com's protected-resource metadata redirects EU accounts to this
// regional endpoint (confirmed in the Fase 0 spike — see
// docs/superpowers/specs/2026-08-23-coros-integration-design.md). The SDK's
// RFC 8707 resource check rejects the mismatch if you connect to the
// non-regional URL, so this must point at the regional one directly.
const MCP_URL = process.env.COROS_MCP_URL ?? 'https://mcpeu.coros.com/mcp';
const CLIENT_INFO = { name: 'recoveryos', version: '1.0.0' } as const;

export interface CorosToolResult {
  text: string;
  isError: boolean;
}

// COROS currently wraps tool output in a JSON-encoded string. Decode it so
// downstream parsers receive real line breaks instead of literal "\\n" text.
export function normalizeCorosToolText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('"')) return text;

  try {
    const decoded: unknown = JSON.parse(trimmed);
    return typeof decoded === 'string' ? decoded : text;
  } catch {
    return text;
  }
}

@Injectable()
export class CorosMcpClient {
  constructor(@Inject(COROS_REPOSITORY) private readonly repo: CorosRepositoryPort) {}

  private get redirectUri(): string {
    const uri = process.env.COROS_REDIRECT_URI;
    if (!uri) throw new Error('COROS_REDIRECT_URI is not configured');
    return uri;
  }

  /**
   * Starts (or resumes) authorization for `userId`. Returns the URL the
   * user's browser must be redirected to, or `null` if already authorized
   * (existing tokens connected without needing a redirect).
   */
  async getAuthorizationUrl(userId: string): Promise<string | null> {
    let capturedUrl: string | null = null;
    const provider = createCorosOAuthProvider({
      userId,
      repo: this.repo,
      redirectUri: this.redirectUri,
      onAuthorizationUrl: (url) => {
        capturedUrl = url;
      },
    });
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider });
    const client = new Client(CLIENT_INFO, { capabilities: {} });

    try {
      await client.connect(transport);
      await client.close();
      return null;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) throw error;
      if (!capturedUrl) throw new Error('COROS MCP did not produce an authorization URL');
      return capturedUrl;
    }
  }

  /**
   * Completes the OAuth flow after the user authorizes in their browser and
   * COROS redirects back with `code`. `codeVerifier` must be the one
   * persisted during `getAuthorizationUrl`'s call (looked up by `state` —
   * see Task 7's `HandleCorosCallbackUseCase`).
   */
  async completeAuthorization(userId: string, code: string, codeVerifier: string): Promise<void> {
    const exchangeProvider = createCorosOAuthProvider({
      userId,
      repo: this.repo,
      redirectUri: this.redirectUri,
      knownCodeVerifier: codeVerifier,
    });
    const exchangeTransport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: exchangeProvider });
    await exchangeTransport.finishAuth(code);

    // finishAuth() only exchanges the code for tokens — StreamableHTTPClientTransport
    // refuses to start() twice on the same instance (confirmed in the Fase 0
    // spike), so confirming the tokens actually work requires a fresh
    // transport/client pair, exactly like connect.ts's retry.
    const verifyProvider = createCorosOAuthProvider({ userId, repo: this.repo, redirectUri: this.redirectUri });
    const verifyTransport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: verifyProvider });
    const verifyClient = new Client(CLIENT_INFO, { capabilities: {} });
    await verifyClient.connect(verifyTransport);
    await verifyClient.close();
  }

  /**
   * Calls a single COROS MCP tool for `userId`. Access-token refresh (via the
   * stored refresh_token) happens transparently inside `client.connect()`;
   * if the refresh token itself is no longer valid, this throws
   * `UnauthorizedError` — callers must treat that as "user must reconnect",
   * not retry (see Task 8).
   */
  async callTool(userId: string, name: string, args: Record<string, unknown>): Promise<CorosToolResult> {
    const provider = createCorosOAuthProvider({ userId, repo: this.repo, redirectUri: this.redirectUri });
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider });
    const client = new Client(CLIENT_INFO, { capabilities: {} });

    await client.connect(transport);
    try {
      const result = await client.callTool({ name, arguments: args });
      const first = Array.isArray(result.content) ? result.content[0] : undefined;
      const rawText = first && (first as { type?: string }).type === 'text' ? (first as { text: string }).text : '';
      return { text: normalizeCorosToolText(rawText), isError: Boolean(result.isError) };
    } finally {
      await client.close();
    }
  }
}
