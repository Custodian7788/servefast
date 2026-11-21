// Keeps loaded files across a refresh. This is a local copy only, so that a
// reload does not throw your work away; the originals still live on your disk,
// and once accounts exist this moves to the server.
const DB = "servefast";
const STORE = "docs";

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run(mode, work) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const result = work(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(result?.result ?? result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function loadStoredDocs() {
  try {
    const all = await run("readonly", (store) => store.getAll());
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
}

export async function storeDocs(docs) {
  try {
    await run("readwrite", (store) => {
      store.clear();
      docs.forEach((d) => store.put(d));
    });
  } catch {
    // Storage blocked or full: the app still works for this session.
  }
}

export async function clearStoredDocs() {
  try {
    await run("readwrite", (store) => store.clear());
  } catch {
    // nothing to do
  }
}
