// scripts/coros-mcp-spike/src/config.ts
import path from "node:path";

export const MCP_URL = "https://mcp.coros.com/mcp";
export const STORE_DIR = path.resolve(import.meta.dirname, "..", ".coros-spike-store");
export const FIXTURES_DIR = path.resolve(import.meta.dirname, "..", "fixtures");
export const CALLBACK_PORT = 8090;
export const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;
