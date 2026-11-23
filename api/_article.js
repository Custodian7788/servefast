// Reads the article behind a headline. The feed blurb is a teaser, capped at
// 300 characters, so anything written from it alone stays thin.

export const ARTICLE_CHARS = 6000; // roughly a thousand words

export function articleText(html) {
  const body = (/<article[\s\S]*?<\/article>/i.exec(html) || [])[0] || html;
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function readArticle(url) {
  if (!url) return "";
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; servefast/1.0; +https://servefast.com)",
        accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return "";
    const type = response.headers.get("content-type") || "";
    if (!type.includes("html")) return "";
    const text = articleText(await response.text());
    // Short means a paywall or a cookie page, not an article.
    return text.length < 400 ? "" : text.slice(0, ARTICLE_CHARS);
  } catch {
    return "";
  }
}
