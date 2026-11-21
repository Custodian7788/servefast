import { useCallback, useState } from "react";

// Dropped files are held in memory only. Nothing is written to the browser, so
// a browser reset cannot lose anything. Saving will go to the server once
// accounts exist.

// PDF, Word and Outlook files are containers, not text: reading them as text
// gives mojibake, so they are refused until a parser is added.
function looksBinary(text) {
  if (!text) return false;
  const sample = text.slice(0, 4000);
  if (sample.includes("\u0000")) return true;
  const odd = (sample.match(/[�]/g) || []).length;
  return odd / sample.length > 0.02;
}

export function useDocs() {
  const [docs, setDocs] = useState([]); // [{ id, name, text }]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      const read = await Promise.all(
        files.map(async (file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          text: await file.text(),
        }))
      );

      const unreadable = read.filter((d) => looksBinary(d.text));
      const usable = read.filter((d) => !looksBinary(d.text));

      if (unreadable.length) {
        setError(
          `${unreadable.map((d) => d.name).join(", ")} is not plain text yet – PDF, Word and .msg need a parser.`
        );
      }

      setDocs((prev) => {
        const seen = new Set(prev.map((d) => d.id));
        return [...prev, ...usable.filter((d) => !seen.has(d.id))];
      });
    } catch {
      setError("One of those files could not be read.");
    } finally {
      setBusy(false);
    }
  }, []);

  const removeDoc = useCallback((id) => setDocs((prev) => prev.filter((d) => d.id !== id)), []);
  const clearDocs = useCallback(() => {
    setDocs([]);
    setError(null);
  }, []);

  return { docs, busy, error, addFiles, removeDoc, clearDocs };
}
