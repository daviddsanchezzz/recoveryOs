import open from "open";
import { randomBytes } from "node:crypto";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { TokenStore } from "./token-store.js";
import { CALLBACK_URL } from "./config.js";

let pendingCodeVerifier: string | undefined;
let pendingState: string | undefined;

export function getPendingState(): string | undefined {
  return pendingState;
}

export function createCorosOAuthProvider(store: TokenStore): OAuthClientProvider {
  return {
    get redirectUrl() {
      return CALLBACK_URL;
    },
    // The SDK only appends `state` to the authorization URL when the provider
    // implements this optional method (see auth() in the installed SDK's
    // client/auth.js) — without it, no CSRF state is ever generated.
    state() {
      pendingState = randomBytes(32).toString("base64url");
      return pendingState;
    },
    get clientMetadata(): OAuthClientMetadata {
      return {
        redirect_uris: [CALLBACK_URL],
        client_name: "RecoveryOS COROS Spike",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      };
    },
    async clientInformation() {
      return store.loadClientInfo() as Promise<OAuthClientInformationMixed | undefined>;
    },
    async saveClientInformation(info: OAuthClientInformationMixed) {
      await store.saveClientInfo({ client_id: info.client_id, client_secret: info.client_secret });
    },
    async tokens() {
      const stored = await store.loadTokens();
      if (!stored) return undefined;
      return {
        access_token: stored.access_token,
        refresh_token: stored.refresh_token,
        token_type: "Bearer",
      } as OAuthTokens;
    },
    async saveTokens(tokens: OAuthTokens) {
      await store.saveTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        obtained_at: Date.now(),
      });
    },
    async redirectToAuthorization(authorizationUrl: URL) {
      pendingState = authorizationUrl.searchParams.get("state") ?? undefined;
      console.log(`Opening browser for COROS authorization:\n${authorizationUrl.toString()}\n`);
      await open(authorizationUrl.toString());
    },
    async saveCodeVerifier(codeVerifier: string) {
      pendingCodeVerifier = codeVerifier;
    },
    async codeVerifier() {
      if (!pendingCodeVerifier) throw new Error("No code verifier saved — did authorization start?");
      return pendingCodeVerifier;
    },
  };
}
