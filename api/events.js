import Anthropic from "@anthropic-ai/sdk";
import { FEEDS } from "./feeds.js";
import { decode } from "./_text.js";
import { notACompany, marketNoise } from "./_guards.js";

// Builds the day's list and nothing more.
//
// Reading a wide set of feeds is free. Deciding which headlines are worth
// listing costs about a tenth of a cent for the whole day, because the small
// model sees titles only. Summaries and perspectives are not written here:
// they are written by api/story.js when someone actually opens a story, and
// cached after, so nothing is paid for that nobody reads.

const MAX_PER_FEED = 20;
const MAX_ITEMS = 600;
const WINDOW_HOURS = 12; // older than this and a story drops off the list
const KEEP = 100; // headlines a sweep lists at most

// Haiku could not hold a long rubric across 600 headlines: outlets, indices
// and countries came back in the company field. Sonnet does.
const SIFT_MODEL = "claude-sonnet-5-5";
const PRICES = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
};

function spend(model, usage) {
  const price = PRICES[model];
  if (!price || !usage) return 0;
  return (
    ((usage.input_tokens || 0) * price.in + (usage.output_tokens || 0) * price.out) / 1_000_000
  );
}

function stripTags(value = "") {
  return decode(
    String(value)
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]*>/g, "")
  )
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

const SIFT = `You sort a day of raw headlines for an investor in listed
technology companies. You decide what is worth listing and you tidy the
wording. You never summarise the story and you never explain it.

TWO TESTS. An item must pass both.

ONE. Is there a named company, and does the story change what that company
will earn, spend, sell or be allowed to do? A country, a city, an index, a
currency, an economy and a government are not companies, so "Singapore GDP"
and "the Fed" fail. Importance in the world is not the test: wars, elections
and summits are important and still fail it.

TWO. Is that company a technology company, in the sense of the categories
below? Nvidia, Anthropic, Uber, Medtronic, Autodesk, a biotech, a defence
electronics firm: yes. A supermarket, a clothing chain, a chocolate maker, a
sporting goods retailer, a discount store, a bank, an airline, an oil major:
no, however large. Do not file a retailer under "Internet and platforms"
because it has a website. If the company is not a technology company, drop
the item however good the news is.

KEEP only these, and only with a named company:
- results, guidance, revenue, margins, an earnings date, a profit warning
- an order, a contract award, a customer win or loss, a supply deal
- a product or service reaching a real stage: shipping, approved, launched
  in a named market, connected, certified
- a plant, a capacity decision, a shortage, a price change in an input
- an acquisition, a merger, a stake, a funding round, an IPO, a spin-off
- a regulator acting on named firms: an export control, a licence, a fine,
  an antitrust ruling, an approval, a standard with a date
- a chief executive, chief financial officer or founder arriving or leaving
- a named competitor taking share from another named company

DROP everything else. These keep getting through and must not:
- summits, conferences, climate talks, COP, declarations, communiques
- diplomacy, elections, polls, cabinet changes, party politics, protest
- wars, troop movements, fleets, exercises, border incidents, unless the
  story names a contract or a named supplier
- aid, relief, recovery and humanitarian packages
- consumer marketing of every kind: discounts, holiday offers, Black Friday,
  design refreshes, sponsorships, rebrands, a firm targeting a new sort of
  buyer
- opinion, commentary, explainers, analyst forecasts, price targets,
  stock tips, best-stocks lists, what-to-watch pieces
- earnings previews and curtain-raisers: anything of the form "earnings
  analysis", "questions answered and next catalysts", "what to expect",
  "options setup", "expected move ahead of results". Results that have
  actually been published, with figures, are fine; speculation about results
  that have not is not. The giveaway is a headline that promises what an
  article will discuss rather than stating a fact: "questions answered",
  "next catalysts", "what to expect", "all you need to know". Do not rewrite
  one of these into something that sounds like news. Drop it.
- crime, sport, celebrity, weather, personnel gossip below the top table
- index moves, market recaps, and above all a share price that moved with no
  cause given: "jumps 28% alongside peers", "soars as the sector gains
  momentum", "rallies on optimism". If the story does not say what the
  company did, there is nothing to keep
- anything whose only point is that something adds uncertainty, raises
  questions or may affect sentiment

Be hard about it. Twenty items that each name a company and a change beat a
hundred that read like a newspaper front page. An empty list is a fine
answer on a quiet day. Drop near-duplicates, keeping the clearest.

Every kept item sits in exactly one of these categories:
${CATEGORIES.join(", ")}.
If a headline fits none of them even loosely, drop the item. Never stretch a
category to fit.

For each one you keep, give:
- "n": the number printed in front of the headline.
- "category": one of the list above.
- "company": the one listed company the story lands on hardest, by name. If
  you cannot fill this in, you should have dropped the item.
- "headline": the same fact, tidied into one plain sentence of at most 20
  words. Strip the outlet branding, the clickbait and the trailing dash.
  Never add a fact that is not already in the headline you were given.

Return JSON only, nothing else, at most ${KEEP} items, strongest first:
{"keep":[{"n":12,"category":"Autonomous and EV","company":"Waymo","headline":"..."}]}
If nothing qualifies, return {"keep":[]}.`;

function readJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON in the answer");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    // A list cut off mid-item is still a list. Keep the entries that closed.
    const keep = [];
    const each = /{[^{}]*"n"s*:s*d+[^{}]*}/g;
    let found;
    while ((found = each.exec(text))) {
      try {
        keep.push(JSON.parse(found[0]));
      } catch {
        // Skip the one that is broken, keep going.
      }
    }
    if (!keep.length) throw new Error("nothing usable in the answer");
    return { keep };
  }
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
      max_tokens: 16000,
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
    const outlets = new Set(FEEDS.map((f) => f.source.toLowerCase()));
    const seenCompany = new Set();

    const events = keep
      .map((pick) => ({ pick, item: items[Number(pick.n) - 1] }))
      .filter(({ pick, item }) => {
        if (!item || !CATEGORIES.includes(pick.category)) return false;

        // The company field is where the sift gives itself away. Checked here
        // rather than trusted, because a prompt cannot be relied on for this.
        const company = String(pick.company || "").trim();
        if (notACompany(company, outlets)) return false;

        // A headline that is only a price move, a tip or an explainer.
        const head = `${pick.headline || ""} ${item.title || ""}`.toLowerCase();
        if (marketNoise(head)) return false;

        // One story per company per sweep: the duplicates were all the same
        // event told twice by different outlets.
        const mark = company.toLowerCase();
        if (seenCompany.has(mark)) return false;
        seenCompany.add(mark);
        return true;
      })
      .slice(0, KEEP)
      .map(({ pick, item }, i) => ({
        id: `ev-${Date.now()}-${i}`,
        date: new Date().toISOString().slice(0, 10),
        text: pick.headline || item.title,
        summary: "",
        publishedAt: new Date(item.at || Date.now()).toISOString(),
        category: pick.category,
        company: pick.company || "",
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
