export type JiraSource = "primary" | "tools";

export type JiraIssue = {
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  description: string;
  created: string;
  updated: string;
  issueType: string;
  url?: string;
  source?: JiraSource;
  storageKey?: string;
};

const DB_NAME = "rta-report-analyzer-jira";
const STORE = "issues";
const DB_VERSION = 2;

function normalized(issue: JiraIssue, fallback: JiraSource = "primary"): JiraIssue {
  const source = issue.source ?? fallback;
  return { ...issue, source, storageKey: `${source}:${issue.key || issue.summary}` };
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
      db.createObjectStore(STORE, { keyPath: "storageKey" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function replaceJiraSource(issues: JiraIssue[], source: JiraSource) {
  const db = await openDb();
  const existing = await new Promise<JiraIssue[]>((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const keep = existing.filter((issue) => (issue.source ?? "primary") !== source);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    [...keep, ...issues.map((issue) => normalized(issue, source))].forEach((issue) => store.put(normalized(issue)));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function saveJiraIssues(issues: JiraIssue[]) {
  const grouped = issues.map((issue) => normalized(issue));
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    grouped.forEach((issue) => store.put(issue));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadJiraIssues() {
  const db = await openDb();
  const result = await new Promise<JiraIssue[]>((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.map((issue: JiraIssue) => normalized(issue)));
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearJiraIssues(source?: JiraSource) {
  const db = await openDb();
  if (!source) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } else {
    const all = await new Promise<JiraIssue[]>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      all.filter((issue) => (issue.source ?? "primary") !== source).forEach((issue) => store.put(normalized(issue)));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  db.close();
}
