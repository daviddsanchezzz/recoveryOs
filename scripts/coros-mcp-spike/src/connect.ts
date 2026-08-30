import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { MCP_URL, STORE_DIR, CALLBACK_PORT } from "./config.js";
import { createTokenStore } from "./token-store.js";
import { createCorosOAuthProvider, getPendingState } from "./oauth-provider.js";
import { waitForCallback } from "./callback-server.js";

async function main() {
  const store = createTokenStore(STORE_DIR);
  const authProvider = createCorosOAuthProvider(store);
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider });
  const client = new Client({ name: "recoveryos-coros-spike", version: "0.0.0" }, { capabilities: {} });

  try {
    await client.connect(transport);
    console.log("Already authorized — connected without a browser prompt.");
    const tools = await client.listTools();
    console.log(`Connected. Server exposes ${tools.tools.length} tools.`);
    await client.close();
    return;
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
  }

  console.log(`Waiting for you to authorize in the browser (listening on port ${CALLBACK_PORT})...`);
  const { code, state } = await waitForCallback(CALLBACK_PORT);
  const expectedState = getPendingState();
  if (expectedState !== undefined && state !== expectedState) {
    throw new Error("OAuth callback 'state' did not match the value sent in the authorization request — possible CSRF/interception, aborting.");
  }
  await transport.finishAuth(code);

  // The first transport's internal AbortController is already consumed by the
  // failed connect() attempt above (its start() refuses to run twice), so we
  // reconnect with a fresh transport/client. The auth provider's token store
  // already has the tokens finishAuth() just saved, so this connects cleanly.
  const retryTransport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider });
  const retryClient = new Client({ name: "recoveryos-coros-spike", version: "0.0.0" }, { capabilities: {} });
  await retryClient.connect(retryTransport);
  console.log("Authorization complete, connected to COROS MCP.");

  const tools = await retryClient.listTools();
  console.log(`Connected. Server exposes ${tools.tools.length} tools.`);
  await retryClient.close();
}

main().catch((err) => {
  console.error("connect.ts failed:", err);
  process.exit(1);
});
