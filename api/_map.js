import { get, set, ready } from "./_kv.js";

// The map is not a folder of what you saved. It is the by-product of reading.
//
// Every time an industry read is written for the first time, the market it
// named, the companies in it and which way it leans are added here. After a
// week of ordinary reading this says which markets the news keeps landing on
// and in which direction, without anyone having filed anything.

const KEY = "sf:map:v1";
const MAX_MARKETS = 120;
const MAX_STORIES = 25;
const MAX_LEANS = 12;

export async function readMap() {
  if (!ready) return {};
  try {
    const raw = await get(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Markets arrive named by a model, so "3D NAND flash" and "3D NAND flash
// memory" would otherwise sit apart. Fold on a loose key, keep the fullest
// spelling as the label.
function fold(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|and|market|markets|industry|industries|sector|services|technology|technologies)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function recordRead({ market, category, lean, players = [], story = {} }) {
  if (!ready) return false;
  const key = fold(market);
  if (!key) return false;

  try {
    const map = await readMap();
    const now = Date.now();
    const entry = map[key] || {
      label: market,
      category: category || "",
      count: 0,
      firstAt: now,
      lastAt: now,
      companies: {},
      leans: [],
      stories: [],
    };

    // The longest spelling tends to be the most specific one.
    if (String(market).length > String(entry.label).length) entry.label = market;
    if (category && !entry.category) entry.category = category;

    entry.count += 1;
    entry.lastAt = now;

    for (const name of players.slice(0, 8)) {
      const who = String(name || "").trim();
      if (!who || who.length > 40) continue;
      entry.companies[who] = (entry.companies[who] || 0) + 1;
    }

    if (lean) entry.leans = [{ at: now, text: String(lean).slice(0, 160) }, ...entry.leans].slice(0, MAX_LEANS);

    if (story.title) {
      entry.stories = [
        { title: String(story.title).slice(0, 180), url: story.url || "", source: story.source || "", at: now },
        ...entry.stories.filter((s) => s.url !== story.url),
      ].slice(0, MAX_STORIES);
    }

    map[key] = entry;

    // Keep it bounded: the markets you have read about most recently win.
    const kept = Object.entries(map)
      .sort((a, b) => (b[1].lastAt || 0) - (a[1].lastAt || 0))
      .slice(0, MAX_MARKETS);

    await set(KEY, JSON.stringify(Object.fromEntries(kept)));
    return true;
  } catch {
    // The map failing must never stop the read it came from.
    return false;
  }
}
