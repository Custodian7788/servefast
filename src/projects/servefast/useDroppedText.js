import { useCallback, useState } from "react";

// Reads dropped or picked files into memory only. Nothing is written to the
// browser, so there is nothing a browser reset could wipe. Real saving will go
// to the server once accounts exist.
export function useDroppedText() {
  const [doc, setDoc] = useState(null); // { name, text }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const readFile = useCallback(async (file) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      setDoc({ name: file.name, text });
    } catch {
      setError("That file could not be read.");
    } finally {
      setBusy(false);
    }
  }, []);

  const clear = useCallback(() => {
    setDoc(null);
    setError(null);
  }, []);

  return { doc, busy, error, readFile, clear };
}

export function wordCount(text) {
  return (text.trim().match(/\S+/g) || []).length;
}
