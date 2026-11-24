import crypto from "node:crypto";
import { get, set, ready } from "./_kv.js";
import { decode } from "./_text.js";

// Fetches an article and hands back its paragraphs, so it can be read inside
// a block rather than in another window. No model is involved, so this is
// free: a fetch, some tag stripping, and a cache so the second read is
// instant.

const TTL_DAYS = 7;
const MAX_PARAGRAPHS = 120;
const MAX_CHARS = 40000;

function clean(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function textOf(fragment) {
  return decode(fragment.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// Paragraphs are kept apart rather than flattened, because an article read as
// one block of text is no better than the blurb was.
function paragraphsFrom(html) {
  const scoped = (/<article[\s\S]*?<\/article>/i.exec(html) || [])[0] || html;
  const blocks = scoped.match(/<(p|h2|h3|li|blockquote)\b[^>]*>[\s\S]*?<\/\1>/gi) || [];

  const seen = new Set();
  const out = [];
  for (const block of blocks) {
    const kind = (/^<(\w+)/.exec(block) || [])[1]?.toLowerCase() || "p";
    const text = textOf(block);
    if (text.length < 40) continue; // menu items, captions, cookie lines
    if (seen.has(text)) continue;
    seen.add(text);
    out.push({ kind: kind === "h2" || kind === "h3" ? "head" : "text", text });
    if (out.length >= MAX_PARAGRAPHS) break;
  }
  return out;
}

function titleFrom(html) {
  const h1 = (/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [])[1];
  if (h1) return textOf(h1);
  const title = (/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1];
  return title ? textOf(title) : "";
}

export default async function handler(request, response) {
  const url = request.body?.url || request.query?.url || "";
  if (!/^https?:\/\//i.test(url)) {
    response.status(400).json({ error: "Send a url" });
    return;
  }

  const key = `sf:read:${crypto.createHash("sha256").update(url).digest("hex").slice(0, 24)}`;

  // Text pasted in by hand. Around half the sites refuse to be fetched, so
  // this is how those stories get their body, and it is kept like any other.
  const pasted = typeof request.body?.text === "string" ? request.body.text.trim() : "";
  if (pasted) {
    const paragraphs = pasted
      .split(/\n+/)
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .filter((line) => line.length > 1)
      .slice(0, MAX_PARAGRAPHS)
      .map((line) => ({ kind: "text", text: line }));

    const out = {
      title: "",
      site: new URL(url).hostname.replace(/^www\./, ""),
      url,
      words: pasted.split(/\s+/).filter(Boolean).length,
      paragraphs,
      pasted: true,
    };

    if (ready) {
      try {
        await set(key, JSON.stringify(out), TTL_DAYS * 24 * 60 * 60);
      } catch {
        // The text still comes back even if it could not be kept.
      }
    }
    response.status(200).json({ ...out, cached: false });
    return;
  }

  try {
    if (ready) {
      const kept = await get(key);
      if (kept) {
        response.status(200).json({ ...JSON.parse(kept), cached: true });
        return;
      }
    }
  } catch {
    // A store that will not answer is not a reason to refuse the article.
  }

  try {
    const result = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; servefast/1.0; +https://servefast.com)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
    });

    if (!result.ok) {
      response.status(200).json({ blocked: true, reason: `The site answered ${result.status}`, url: result.url || url });
      return;
    }

    const type = result.headers.get("content-type") || "";
    if (!type.includes("html")) {
      response.status(200).json({ blocked: true, reason: "That link is not an article page", url: result.url || url });
      return;
    }

    const html = clean((await result.text()).slice(0, 600000));
    const paragraphs = paragraphsFrom(html);
    const words = paragraphs.reduce((n, p) => n + p.text.split(" ").length, 0);

    if (words < 80) {
      response.status(200).json({
        blocked: true,
        reason: "Only a teaser came back, so this one is behind a paywall",
        url: result.url || url,
        title: titleFrom(html),
      });
      return;
    }

    let chars = 0;
    const trimmed = [];
    for (const p of paragraphs) {
      chars += p.text.length;
      if (chars > MAX_CHARS) break;
      trimmed.push(p);
    }

    const out = {
      title: titleFrom(html),
      site: new URL(result.url || url).hostname.replace(/^www\./, ""),
      url: result.url || url,
      words,
      paragraphs: trimmed,
    };

    if (ready) {
      try {
        await set(key, JSON.stringify(out), TTL_DAYS * 24 * 60 * 60);
      } catch {
        // Not worth failing the response over.
      }
    }

    response.status(200).json({ ...out, cached: false });
  } catch (error) {
    response.status(200).json({ blocked: true, reason: error?.message || "That site did not answer", url });
  }
}
