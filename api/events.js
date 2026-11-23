import Anthropic from "@anthropic-ai/sdk";
import { FEEDS } from "./feeds.js";

// Builds the day's list and nothing more.
//
// Reading a wide set of feeds is free. Deciding which headlines are worth
// listing costs about a tenth of a cent for the whole day, because the small
// model sees titles only. Summaries and perspectives are not written here:
// they are written by api/story.js when someone actually opens a story, and
// cached after, so nothing is paid for that nobody reads.

const MAX_PER_FEED = 20;
const MAX_ITEMS = 600;
const WINDOW_HOURS = 24;
const KEEP = 100; // headlines a sweep lists at most

const SIFT_MODEL = "claude-haiku-5-5";
const PRICES = { "claude-haiku-5-5": { in: 0.1, out: 0.5 } };

function spend(model, usage) {
  const price = PRICES[model];
  if (!price || !usage) return 0;
  return (
    ((usage.input_tokens || 0) * price.in + (usage.output_tokens || 0) * price.out) / 1_000_000
  );
}

function stripTags(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block, names) {
  for (const name of names) {
    const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
    if (match) return stripTags(match[1]);
  }
  return "";
}

function parseFeed(xml, source) {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
  return blocks.slice(0, MAX_PER_FEED).map((block) => {
    const link =
      firstTag(block, ["link"]) ||
      (/<link[^>]*href="([^"]+)"/i.exec(block) || [])[1] ||
      "";
    return {
      source,
      title: firstTag(block, ["title"]),
      summary: firstTag(block, ["description", "summary"]).slice(0, 300),
      published: firstTag(block, ["pubDate", "published", "updated"]),
      link,
    };
  });
}

async function readFeed({ source, url }) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "servefast/1.0 (+https://servefast.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    return parseFeed(await response.text(), source);
  } catch {
    return []; // a feed that is down counts as nothing
  }
}

// On a top-up, an item whose feed gives no usable date is treated as old, not
// as new. Dating it "now" would send it again every fifteen minutes.
function recentFirst(items, sinceMs) {
  const cutoff = sinceMs || Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  return items
    .map((item) => ({ ...item, at: Date.parse(item.published) || 0 }))
    .filter((item) => (item.at ? item.at >= cutoff : !sinceMs))
    .map((item) => ({ ...item, at: item.at || Date.now() }))
    .sort((a, b) => b.at - a.at);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 70);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const CATEGORIES = [
  "AI",
  "Semiconductors",
  "Software",
  "Cloud and data centres",
  "Cybersecurity",
  "Robotics and automation",
  "Autonomous and EV",
  "Defence tech",
  "Space",
  "Fintech",
  "Biotech and health tech",
  "Clean energy and grid",
  "Internet and platforms",
];

const SIFT = `You sort a day of raw headlines for an investor who follows
technology industries. You decide what is worth listing and you tidy the
wording. You never summarise the story and you never explain it.

KEEP a headline when you can name an industry and say what changes for it:
- rules: law, sanction, export control, licence, ruling, treaty, approval
- money: tariff, subsidy, tax, rate, price move, funding round, contract award
- supply: conflict, route, resource access, plant, capacity, nationalisation
- technology and companies: a product or service reaching a new stage
  (robotaxi approvals and city launches, a model or chip shipping, a drug
  approved, a reactor connected), a big investment, a partnership, a
  management decision that changes what a company sells or where
- demand: a customer, state or sector buying or stopping buying at scale

DROP only what truly has no industry edge: opinion and commentary, polls,
sport, crime, celebrity, weather, personnel gossip, routine index moves,
analyst forecasts, and anything where the only thing you could write is that
it "adds uncertainty" or "may affect sentiment".

Be generous rather than strict: if a headline would make a reader of that
industry stop and read, keep it. Drop near-duplicates of the same event,
keeping the clearest one.

Every kept item sits in exactly one of these categories:
${CATEGORIES.join(", ")}.
If a headline fits none of them even loosely, drop the item.

For each one you keep, give:
- "n": the number printed in front of the headline.
- "category": one of the list above.
- "headline": the same fact, tidied into one plain sentence of at most 20
  words. Strip the outlet's branding, the clickbait and the trailing dash.
  Never add a fact that is not already in the headline you were given.

Return JSON only, nothing else, at most ${KEEP} items, strongest first:
{"keep":[{"n":12,"category":"Autonomous and EV","headline":"..."}]}
If nothing qualifies, return {"keep":[]}.`;

function readJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON in the answer");
  return JSON.parse(text.slice(start, end + 1));
}

export default async function handler(request, response) {
  if (request.method !== "POST" && request.method !== "GET") {
    response.status(405).json({ error: "Use GET or POST" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: "ANTHROPIC_API_KEY is not set on this project" });
    return;
  }

  try {
    const extra = []
      .concat(request.body?.extra || [])
      .filter((url) => typeof url === "string" && /^https?:\/\//i.test(url))
      .slice(0, 15)
      .map((url) => ({ source: new URL(url).hostname.replace(/^www\./, ""), url }));

    const since = Number(request.body?.since) || 0;
    const topUp = since > 0 && Date.now() - since < WINDOW_HOURS * 60 * 60 * 1000;

    const pulled = (await Promise.all([...FEEDS, ...extra].map(readFeed))).flat();
    const items = dedupe(recentFirst(pulled, topUp ? since : 0)).slice(0, MAX_ITEMS);

    if (!items.length) {
      response.status(200).json({ events: [], read: 0, topUp, cost: 0 });
      return;
    }

    const titles = items.map((item, i) => `${i + 1}. [${item.source}] ${item.title}`).join("\n");

    const client = new Anthropic({ apiKey });
    const sifted = await client.messages.create({
      model: SIFT_MODEL,
      max_tokens: 8000,
      output_config: { effort: "low" },
      system: SIFT,
      messages: [
        { role: "user", content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${titles}` },
      ],
    });

    const cost = spend(SIFT_MODEL, sifted.usage);
    const text = sifted.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    let keep = [];
    try {
      keep = readJSON(text).keep || [];
    } catch {
      response.status(502).json({ error: "Could not read the sift", raw: text.slice(0, 400) });
      return;
    }

    // Nothing is written up here. Each story carries only what the list needs;
    // summary and effects arrive from api/story.js when it is opened.
    const events = keep
      .map((pick) => ({ pick, item: items[Number(pick.n) - 1] }))
      .filter(({ pick, item }) => item && CATEGORIES.includes(pick.category))
      .slice(0, KEEP)
      .map(({ pick, item }, i) => ({
        id: `ev-${Date.now()}-${i}`,
        date: new Date().toISOString().slice(0, 10),
        text: pick.headline || item.title,
        summary: "",
        publishedAt: new Date(item.at || Date.now()).toISOString(),
        category: pick.category,
        effects: [],
        source: item.source || "",
        url: item.link || "",
      }));

    console.log(
      `events: read ${items.length}, listed ${events.length}, cost $${cost.toFixed(4)}${topUp ? " (top-up)" : ""}`
    );

    response.status(200).json({
      events,
      read: items.length,
      topUp,
      cost: Number(cost.toFixed(4)),
    });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
