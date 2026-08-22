import { promises as fs } from "node:fs";
import path from "node:path";

export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  obtained_at: number;
  [key: string]: unknown;
}

export interface StoredClientInfo {
  client_id: string;
  client_secret?: string;
  [key: string]: unknown;
}

export interface TokenStore {
  saveTokens(tokens: StoredTokens): Promise<void>;
  loadTokens(): Promise<StoredTokens | undefined>;
  saveClientInfo(info: StoredClientInfo): Promise<void>;
  loadClientInfo(): Promise<StoredClientInfo | undefined>;
}

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function createTokenStore(storeDir: string): TokenStore {
  const tokensFile = path.join(storeDir, "tokens.json");
  const clientFile = path.join(storeDir, "client.json");

  return {
    saveTokens: (tokens) => writeJsonFile(tokensFile, tokens),
    loadTokens: () => readJsonFile<StoredTokens>(tokensFile),
    saveClientInfo: (info) => writeJsonFile(clientFile, info),
    loadClientInfo: () => readJsonFile<StoredClientInfo>(clientFile),
  };
}
