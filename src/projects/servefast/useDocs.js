import { useCallback, useState } from "react";

// Dropped files are held in memory only. Nothing is written to the browser, so
// a browser reset cannot lose anything. Saving will go to the server once
// accounts exist.
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
      setDocs((prev) => {
        const seen = new Set(prev.map((d) => d.id));
        return [...prev, ...read.filter((d) => !seen.has(d.id))];
      });
    } catch {
      setError("One of those files could not be read.");
    } finally {
      setBusy(false);
    }
  }, []);

  const removeDoc = useCallback((id) => setDocs((prev) => prev.filter((d) => d.id !== id)), []);
  const clearDocs = useCallback(() => setDocs([]), []);

  return { docs, busy, error, addFiles, removeDoc, clearDocs };
}
