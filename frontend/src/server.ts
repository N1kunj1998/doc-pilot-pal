import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const server = {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

export default server;

// --- Node listener -----------------------------------------------------
// Render (and most non-edge hosts) run this file directly with `node`, so it
// needs to actually open a port, not just export a fetch(request) handler.
function toWebRequest(req: import("node:http").IncomingMessage): Request {
  const url = `http://${req.headers.host ?? "localhost"}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value) headers.set(key, value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    // @ts-expect-error -- Node's fetch Request accepts a web ReadableStream body
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  } as RequestInit);
}

async function sendWebResponse(
  res: import("node:http").ServerResponse,
  webRes: Response,
): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  if (!webRes.body) {
    res.end();
    return;
  }
  const reader = webRes.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

// This file lives at dist/server/server.js after build; static client
// assets (JS/CSS bundles) are built alongside it at dist/client.
const clientDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../client");

const MIME_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

async function tryServeStaticFile(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
): Promise<boolean> {
  const pathname = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const resolved = path.normalize(path.join(clientDir, pathname));
  // Prevent path traversal escaping the client assets directory.
  if (!resolved.startsWith(clientDir)) return false;

  try {
    const stats = await stat(resolved);
    if (!stats.isFile()) return false;
  } catch {
    return false;
  }

  const ext = path.extname(resolved);
  res.statusCode = 200;
  res.setHeader("content-type", MIME_TYPES[ext] ?? "application/octet-stream");
  // Vite content-hashes filenames under /assets, so these are safe to cache forever.
  if (pathname.startsWith("/assets/")) {
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
  }
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(resolved);
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(res);
  });
  return true;
}

const port = Number(process.env.PORT) || 3000;
createServer(async (req, res) => {
  try {
    if (await tryServeStaticFile(req, res)) return;
    const webRequest = toWebRequest(req);
    const webResponse = await server.fetch(webRequest, {}, {});
    await sendWebResponse(res, webResponse);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(renderErrorPage());
  }
}).listen(port, () => {
  console.log(`DocPilot frontend listening on port ${port}`);
});
