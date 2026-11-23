// The server side of "nothing disappears when you clear the browser".
//
// A small Redis over HTTP, so there is no driver and no connection to keep
// alive in a serverless function. Vercel's own integration sets KV_REST_API_*;
// a plain Upstash account sets UPSTASH_REDIS_REST_*. Either will do.

const BASE = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

// False until a store is attached to the project. Everything still works; it
// just falls back to the browser until then.
export const ready = Boolean(BASE && TOKEN);

export async function get(key) {
  if (!ready) return null;
  const response = await fetch(`${BASE}/get/${encodeURIComponent(key)}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`store read failed (${response.status})`);
  const body = await response.json();
  return body?.result ?? null;
}

export async function set(key, value, ttlSeconds) {
  if (!ready) return false;
  const path = ttlSeconds
    ? `set/${encodeURIComponent(key)}?EX=${Math.floor(ttlSeconds)}`
    : `set/${encodeURIComponent(key)}`;
  const response = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "text/plain" },
    body: value,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`store write failed (${response.status})`);
  return true;
}
