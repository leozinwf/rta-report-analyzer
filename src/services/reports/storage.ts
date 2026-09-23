const DB_NAME = "rta-report-analyzer-cache";
const STORE_NAME = "excel-files";
const DB_VERSION = 1;

export interface SavedReportFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  savedAt: number;
}

interface StoredReportFile extends SavedReportFile {
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listSavedReports(): Promise<SavedReportFile[]> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result as StoredReportFile[])
        .map(({ blob: _blob, ...metadata }) => metadata)
        .sort((a, b) => b.savedAt - a.savedAt));
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveReportFiles(files: File[]): Promise<void> {
  if (!files.length) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const savedAt = Date.now();
      files.forEach((file) => {
        const id = `${file.name}:${file.size}:${file.lastModified}`;
        store.put({
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          savedAt,
          blob: file,
        } satisfies StoredReportFile);
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSavedReport(id: string): Promise<File | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
      request.onsuccess = () => {
        const item = request.result as StoredReportFile | undefined;
        resolve(item ? new File([item.blob], item.name, { type: item.type || item.blob.type, lastModified: item.lastModified }) : null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteSavedReport(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
