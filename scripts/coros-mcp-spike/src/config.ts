// scripts/coros-mcp-spike/src/config.ts
import path from "node:path";

// mcp.coros.com's protected-resource metadata redirects EU accounts to a
// regional resource (mcpeu.coros.com); the SDK's RFC 8707 resource check
// rejects a mismatch, so we connect to the regional URL directly.
export const MCP_URL = "https://mcpeu.coros.com/mcp";
export const STORE_DIR = path.resolve(import.meta.dirname, "..", ".coros-spike-store");
export const FIXTURES_DIR = path.resolve(import.meta.dirname, "..", "fixtures");
export const CALLBACK_PORT = 8090;
export const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;
