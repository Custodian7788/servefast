// The workspace lives on the server. The browser keeps a copy so a reload is
// instant and so a dropped connection does not stop you working, but the
// server is the truth: clearing browser data loses nothing.

const DB = "servefast";
const STORE = "modules";
const VERSION = 3;

let serverLive = null; // null until the first answer, then true or false

export function onServer() {
  return serverLive;
}

/* ---------------------------------------------------------------- browser */

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Anything saved under an older shape is dropped rather than migrated.
      if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
      if (db.objectStoreNames.contains("docs")) db.deleteObjectStore("docs");
      db.createObjectStore(STORE);
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

async function loadLocal(key) {
  try {
    return await run("readonly", (store) => store.get(key));
  } catch {
    return undefined;
  }
}

async function saveLocal(key, value) {
  try {
    await run("readwrite", (store) => store.put(value, key));
  } catch {
    // Storage blocked or full: the server copy still has it.
  }
}

/* ----------------------------------------------------------------- server */

async function loadServer() {
  const response = await fetch("/api/workspace", { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`workspace ${response.status}`);
  return response.json();
}

async function saveServer(space) {
  const response = await fetch("/api/workspace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspace: space }),
  });
  if (!response.ok) throw new Error(`workspace ${response.status}`);
  return response.json();
}

/* ------------------------------------------------------------------ doors */

export async function loadModule(key) {
  try {
    const answer = await loadServer();
    serverLive = Boolean(answer.server);

    if (serverLive && answer.workspace) {
      saveLocal(key, answer.workspace);
      return answer.workspace;
    }

    if (serverLive) {
      // The store is live but empty. Anything already in this browser is the
      // only copy there is, so send it up before carrying on.
      const local = await loadLocal(key);
      if (local?.modules?.length) {
        saveServer(local).catch(() => {});
        return local;
      }
      return undefined;
    }
  } catch {
    serverLive = false;
  }

  return loadLocal(key);
}

// Typing into a block name fires this on every keystroke, so the server write
// waits for a pause. The browser copy is written straight away.
let pending = null;
let latest = null;

export async function saveModule(key, value) {
  saveLocal(key, value);
  if (serverLive === false) return;

  latest = value;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    const sending = latest;
    saveServer(sending).catch(() => {});
  }, 1200);
}

// A tab being closed should not lose the last few seconds of work.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (!pending || !latest || serverLive === false) return;
    clearTimeout(pending);
    pending = null;
    try {
      navigator.sendBeacon(
        "/api/workspace",
        new Blob([JSON.stringify({ workspace: latest })], { type: "application/json" })
      );
    } catch {
      // Nothing more to try at this point.
    }
  });
}

/* ---------------------------------------------------------------- backups */

export async function listVersions() {
  try {
    const response = await fetch("/api/history");
    if (!response.ok) return [];
    return (await response.json()).versions || [];
  } catch {
    return [];
  }
}

export async function loadVersion(at) {
  try {
    const response = await fetch(`/api/workspace?at=${encodeURIComponent(at)}`);
    if (!response.ok) return null;
    return (await response.json()).snapshot || null;
  } catch {
    return null;
  }
}
