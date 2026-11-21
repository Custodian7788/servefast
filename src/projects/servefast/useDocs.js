import { useCallback, useState } from "react";
import { readFileAsText } from "./parse.js";

// Dropped files are held in memory only. Nothing is written to the browser, so
// a browser reset cannot lose anything. Saving will go to the server once
// accounts exist.

// PDF and Word are containers, not text: reading them as text gives mojibake,
// so they are refused until a parser is added. Outlook .msg and .eml are
// handled properly in parse.js.
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

    const usable = [];
    const failed = [];

    await Promise.all(
      files.map(async (file) => {
        try {
          const text = await readFileAsText(file);
          if (!text || !text.trim() || looksBinary(text)) failed.push(file.name);
          else
            usable.push({
              id: `${file.name}-${file.size}-${file.lastModified}`,
              name: file.name,
              text,
            });
        } catch {
          failed.push(file.name);
        }
      })
    );

    if (failed.length) {
      const needsParser = failed.some((n) => /.(pdf|docx?|pptx?|xlsx?)$/i.test(n));
      setError(
        `Could not read ${failed.join(", ")}${needsParser ? " – PDF and Office files still need a parser." : "."}`
      );
    }

    setDocs((prev) => {
      const seen = new Set(prev.map((d) => d.id));
      return [...prev, ...usable.filter((d) => !seen.has(d.id))];
    });
    setBusy(false);
  }, []);

  const removeDoc = useCallback((id) => setDocs((prev) => prev.filter((d) => d.id !== id)), []);
  const clearDocs = useCallback(() => {
    setDocs([]);
    setError(null);
  }, []);

  return { docs, busy, error, addFiles, removeDoc, clearDocs };
}
