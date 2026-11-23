import { ready } from "./_kv.js";

// What the workspace looked like before each of the last thirty saves. Used to
// get back a block that was deleted by mistake.

const HISTORY = "sf:workspace:history";
const KEEP = 30;

const BASE = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export default async function handler(request, response) {
  if (!ready) {
    response.status(200).json({ server: false, versions: [] });
    return;
  }

  try {
    const result = await fetch(`${BASE}/lrange/${HISTORY}/0/${KEEP}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) throw new Error(`store read failed (${result.status})`);
    const list = (await result.json())?.result || [];

    const versions = list
      .map((entry) => {
        try {
          return JSON.parse(entry);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .map((entry) => {
        const panels = (entry.space?.modules || []).flatMap((m) => m.panels || []);
        return {
          at: entry.at,
          blocks: panels.length,
          titles: panels.map((p) => p.title || "Untitled"),
          stories: panels.reduce((n, p) => n + ((p.tabs?.t1 || []).length), 0),
        };
      });

    response.status(200).json({ server: true, versions });
  } catch (error) {
    response.status(500).json({ error: error?.message || "The store did not answer" });
  }
}
