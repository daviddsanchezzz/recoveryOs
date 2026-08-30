import http from "node:http";

export function waitForCallback(port: number): Promise<{ code: string; state: string | null }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code) {
        res.writeHead(400).end("Missing ?code in callback");
        server.close();
        reject(new Error("OAuth callback did not include a code"));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain" }).end("Authorized. You can close this tab.");
      server.close();
      resolve({ code, state });
    });
    server.listen(port, "127.0.0.1");
  });
}
