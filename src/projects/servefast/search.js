// Splits each document into passages and keeps the ones that match the words
// asked for. This is the first, local way of dissecting - more will follow.
const STOPWORDS = new Set([
  "a", "all", "and", "any", "are", "every", "find", "for", "get", "give", "in",
  "is", "it", "me", "mention", "mentions", "of", "passage", "passages", "show",
  "that", "the", "to", "where", "with",
]);

export function queryTerms(query) {
  return (query.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []).filter(
    (w) => w.length > 1 && !STOPWORDS.has(w)
  );
}

function splitPassages(text) {
  const blocks = text
    .split(/\n\s*\n+/)
    .map((b) => b.replace(/[ \t]+\n/g, "\n").trim())
    .filter(Boolean);
  return blocks.length ? blocks : text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
}

export function findPassages(docs, query) {
  const terms = queryTerms(query);
  if (!terms.length) return [];

  const hits = [];
  for (const doc of docs) {
    splitPassages(doc.text).forEach((passage, i) => {
      const haystack = passage.toLowerCase();
      if (terms.every((t) => haystack.includes(t))) {
        hits.push({ id: `${doc.id}-${i}`, source: doc.name, text: passage, terms });
      }
    });
  }
  return hits;
}
