import { readMap } from "./_map.js";
import { ready } from "./_kv.js";

// Where the reading has been landing. Nothing here is generated: it is what
// the industry reads have already said, counted.

export default async function handler(request, response) {
  if (!ready) {
    response.status(200).json({ server: false, markets: [] });
    return;
  }

  try {
    const map = await readMap();

    const markets = Object.entries(map)
      .map(([key, m]) => ({
        key,
        label: m.label,
        category: m.category || "",
        count: m.count || 0,
        firstAt: m.firstAt,
        lastAt: m.lastAt,
        lean: m.leans?.[0]?.text || "",
        leans: (m.leans || []).map((l) => l.text),
        companies: Object.entries(m.companies || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, seen]) => ({ name, seen })),
        stories: (m.stories || []).slice(0, 10),
      }))
      // Most seen first, and the recent one wins a tie: that is the one the
      // news is on now.
      .sort((a, b) => b.count - a.count || (b.lastAt || 0) - (a.lastAt || 0));

    response.status(200).json({ server: true, markets });
  } catch (error) {
    response.status(500).json({ error: error?.message || "The store did not answer" });
  }
}
