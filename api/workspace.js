import { get, set, ready } from "./_kv.js";

// The workspace itself: modules, blocks, their stories and where you were
// last looking. One shared workspace for now, because there is one password
// and one person behind it. Accounts would make this a key per person.
//
// Every save pushes the version it replaces onto a short history, so a block
// deleted by mistake can be fetched back.

const KEY = "sf:workspace:v1";
const HISTORY = "sf:workspace:history";
const KEEP = 30;
const MAX_BYTES = 4_000_000;

const BASE = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

// A couple of list commands the plain get/set helper does not cover.
async function command(parts, body) {
  const path = parts.map((part) => encodeURIComponent(part)).join("/");
  const response = await fetch(`${BASE}/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      ...(body === undefined ? {} : { "content-type": "text/plain" }),
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`store call failed (${response.status})`);
  return (await response.json())?.result ?? null;
}

export default async function handler(request, response) {
  if (!ready) {
    // No store attached yet. Say so plainly so the browser keeps its own copy
    // rather than quietly losing work.
    response.status(200).json({ server: false, workspace: null });
    return;
  }

  try {
    if (request.method === "GET") {
      const wanted = String(request.query?.at || "");
      if (wanted) {
        // One snapshot out of the history, newest first.
        const list = await command(["lrange", HISTORY, "0", String(KEEP)]);
        const found = (list || [])
          .map((entry) => {
            try {
              return JSON.parse(entry);
            } catch {
              return null;
            }
          })
          .find((entry) => entry && String(entry.at) === wanted);
        response.status(200).json({ server: true, snapshot: found?.space || null });
        return;
      }

      const raw = await get(KEY);
      let workspace = null;
      try {
        workspace = raw ? JSON.parse(raw) : null;
      } catch {
        workspace = null;
      }
      response.status(200).json({ server: true, workspace });
      return;
    }

    if (request.method === "POST") {
      const space = request.body?.workspace;
      if (!space || !Array.isArray(space.modules)) {
        response.status(400).json({ error: "Send { workspace: { modules: [...] } }" });
        return;
      }

      const next = JSON.stringify(space);
      if (next.length > MAX_BYTES) {
        response.status(413).json({ error: "That workspace is too big to save" });
        return;
      }

      // Keep what we are about to overwrite, so nothing is ever only one
      // click away from gone.
      const previous = await get(KEY);
      if (previous && previous !== next) {
        try {
          await command(
            ["lpush", HISTORY],
            JSON.stringify({ at: Date.now(), space: JSON.parse(previous) })
          );
          await command(["ltrim", HISTORY, "0", String(KEEP - 1)]);
        } catch {
          // A history that fails must never stop the save itself.
        }
      }

      await set(KEY, next);
      response.status(200).json({ server: true, saved: true });
      return;
    }

    if (request.method === "DELETE") {
      response.status(405).json({ error: "The workspace is not deleted from here" });
      return;
    }

    response.status(405).json({ error: "Use GET or POST" });
  } catch (error) {
    response.status(500).json({ error: error?.message || "The store did not answer" });
  }
}
