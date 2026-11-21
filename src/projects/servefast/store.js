// Keeps a module's state across a refresh. Local for now, so a reload never
// throws your work away; this moves to the server once accounts exist.
const DB = "servefast";
const STORE = "modules";

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
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
        const request = work(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request && "result" in request ? request.result : undefined);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function loadModule(key) {
  try {
    return await run("readonly", (store) => store.get(key));
  } catch {
    return undefined;
  }
}

export async function saveModule(key, value) {
  try {
    await run("readwrite", (store) => store.put(value, key));
  } catch {
    // Storage blocked or full: the session still works.
  }
}
