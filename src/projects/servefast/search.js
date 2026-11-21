// Plain keyword search over passages. No AI, no summarising: it isolates the
// passages that actually contain what was asked for, best matches first.

// Words that carry no search value, including the ones people use when they
// phrase a search as a sentence.
const STOPWORDS = new Set([
  "a", "about", "all", "an", "and", "any", "anything", "are", "as", "at", "be",
  "but", "by", "can", "contain", "containing", "contains", "did", "do", "does",
  "each", "every", "find", "for", "from", "get", "give", "has", "have", "his",
  "her", "i", "in", "into", "is", "it", "its", "just", "me", "mention",
  "mentioned", "mentions", "my", "of", "on", "or", "our", "out", "passage",
  "passages", "please", "pull", "said", "say", "says", "search", "see", "she",
  "show", "some", "that", "the", "their", "them", "there", "these", "they",
  "this", "those", "to", "us", "was", "we", "were", "what", "when", "where",
  "which", "who", "will", "with", "you", "your",
]);

// "quoted text" stays exact; everything else becomes single words.
export function queryTerms(query) {
  const terms = [];
  const rest = String(query || "").replace(/"([^"]+)"/g, (_, phrase) => {
    const clean = phrase.trim().toLowerCase();
    if (clean) terms.push(clean);
    return " ";
  });

  const words = (rest.toLowerCase().match(/[\p{L}\p{N}'-]+/gu) || []).filter(
    (w) => w.length > 1 && !STOPWORDS.has(w)
  );

  // If someone types only stopwords, fall back to those words rather than
  // returning nothing at all.
  const useful = words.length ? words : (rest.toLowerCase().match(/[\p{L}\p{N}'-]+/gu) || []);
  return [...new Set([...terms, ...useful])];
}

const HEADER_LINE = /^(from|to|cc|bcc|date|subject|sent|reply-to):/i;

function isHeaderBlock(block) {
  const lines = block.split(/\n/).filter(Boolean);
  if (!lines.length) return false;
  return lines.filter((l) => HEADER_LINE.test(l.trim())).length >= Math.max(2, lines.length - 1);
}

function splitPassages(text) {
  const blocks = text
    .split(/\n\s*\n+/)
    .map((b) => b.replace(/[ \t]+\n/g, "\n").trim())
    .filter(Boolean)
    .filter((b) => !isHeaderBlock(b));
  if (blocks.length > 1) return blocks;

  // One solid block: fall back to single lines so results stay readable.
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines : [text.trim()].filter(Boolean);
}

// A passage counts when it holds at least one of the words asked for; the more
// of them it holds, the higher it sits.
export function findPassages(docs, query) {
  const terms = queryTerms(query);
  if (!terms.length) return [];

  const hits = [];
  docs.forEach((doc) => {
    const passages = splitPassages(doc.text);
    passages.forEach((passage, i) => {
      const haystack = passage.toLowerCase();
      const matched = terms.filter((t) => haystack.includes(t));
      if (!matched.length) return;

      const count = matched.reduce(
        (sum, t) => sum + haystack.split(t).length - 1,
        0
      );
      hits.push({
        id: `${doc.id}-${i}`,
        source: doc.name,
        doc,
        place: i + 1,
        of: passages.length,
        text: passage,
        terms: matched,
        score: matched.length * 1000 + count,
      });
    });
  });

  return hits.sort((a, b) => b.score - a.score);
}
