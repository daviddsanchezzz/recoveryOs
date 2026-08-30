import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MCP_URL, STORE_DIR, FIXTURES_DIR } from "./config.js";
import { createTokenStore } from "./token-store.js";
import { createCorosOAuthProvider } from "./oauth-provider.js";

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const TOOL_CALLS: Array<{ name: string; args: Record<string, unknown> }> = [
  { name: "queryDailyHealthData", args: { date: yesterday() } },
  { name: "querySleepData", args: { date: yesterday() } },
  { name: "querySleepHrv", args: { date: yesterday() } },
  { name: "queryRestingHeartRate", args: { startDate: yesterday(), endDate: yesterday() } },
];

async function main() {
  const store = createTokenStore(STORE_DIR);
  const existing = await store.loadTokens();
  if (!existing) {
    throw new Error("No stored tokens found. Run `npm run connect` first (interactively) before running query.ts.");
  }

  const authProvider = createCorosOAuthProvider(store);
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider });
  const client = new Client({ name: "recoveryos-coros-spike", version: "0.0.0" }, { capabilities: {} });

  console.log("Connecting without opening a browser (this is the actual feasibility test)...");
  await client.connect(transport);
  console.log("Connected without human interaction. Session/refresh reuse works.");

  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  for (const call of TOOL_CALLS) {
    console.log(`Calling ${call.name}(${JSON.stringify(call.args)})...`);
    try {
      const result = await client.callTool({ name: call.name, arguments: call.args });
      const fixturePath = path.join(FIXTURES_DIR, `${call.name}.json`);
      await fs.writeFile(fixturePath, JSON.stringify(result, null, 2), "utf-8");
      console.log(`  saved -> ${fixturePath}`);
    } catch (err) {
      console.error(`  FAILED: ${call.name}:`, err);
    }
  }

  await client.close();
}

main().catch((err) => {
  console.error("query.ts failed:", err);
  process.exit(1);
});
