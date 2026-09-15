import { Database, FileSpreadsheet, Layers3, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressBar, progressLabel } from "../components/common/ProgressBar";
import { useReport } from "../context/ReportContext";
import { formatNumber } from "../utils/format";

const DB_NAME = "rta-report-analyzer-cache";
const STORE_NAME = "excel-files";
const MAX_FILES = 20;

type CachedFile = { id: string; name: string; size: number; savedAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listCachedFiles(): Promise<CachedFile[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as Array<CachedFile & { blob: Blob }>).sort((a, b) => b.savedAt - a.savedAt));
    request.onerror = () => reject(request.error);
  });
}

async function deleteCachedFile(id: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function cacheFiles(files: File[]) {
  const db = await openDb();
  for (const file of files) {
    const id = `${file.name}:${file.size}:${file.lastModified}`;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ id, name: file.name, size: file.size, savedAt: Date.now(), blob: file });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  const all = await listCachedFiles();
  for (const item of all.slice(MAX_FILES)) await deleteCachedFile(item.id);
}

async function getCachedFile(id: string): Promise<File | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => {
      const item = request.result as (CachedFile & { blob: Blob }) | undefined;
      resolve(item ? new File([item.blob], item.name, { type: item.blob.type }) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export function UploadPage() {
  const { loadFiles, runAnalysis, phase, progress, parsed, loadedReports, error, warnings } = useReport();
  const [dragOver, setDragOver] = useState(false);
  const [cachedFiles, setCachedFiles] = useState<CachedFile[]>([]);
  const [selectedCached, setSelectedCached] = useState<string[]>([]);
  const navigate = useNavigate();

  const refreshCache = useCallback(async () => {
    try { setCachedFiles(await listCachedFiles()); } catch { setCachedFiles([]); }
  }, []);

  useEffect(() => { void refreshCache(); }, [refreshCache]);

  const onFiles = useCallback(async (files: FileList | File[]) => {
    const selected = Array.from(files).filter((file) => /\.(xlsx|xls)$/i.test(file.name)).slice(0, MAX_FILES);
    if (!selected.length) return;
    try {
      await cacheFiles(selected);
      await refreshCache();
    } catch {
      setCachedFiles([]);
    }
    await loadFiles(selected);
  }, [loadFiles, refreshCache]);

  async function reuseCached() {
    const files = (await Promise.all(selectedCached.map(getCachedFile))).filter(Boolean) as File[];
    if (files.length) await loadFiles(files.slice(0, MAX_FILES));
  }

  async function analyze() {
    await runAnalysis();
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Ferramenta interna de operação</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">RTA Report Analyzer</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">Envie Automation, CRT Geral ou os dois juntos. Os últimos {MAX_FILES} arquivos ficam salvos temporariamente neste navegador para reutilização.</p>
      </div>

      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); void onFiles(e.dataTransfer.files); }} className={`mt-6 rounded-3xl border-2 border-dashed p-7 text-center transition ${dragOver ? "border-accent bg-accent/10" : "border-line bg-panel/80"}`}>
        <FileSpreadsheet className="mx-auto size-10 text-accent" />
        <p className="mt-3 font-medium">Arraste um ou mais relatórios Excel aqui</p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
          <Upload className="size-4" /> Selecionar arquivos
          <input type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={(e) => { if (e.target.files) void onFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <p className="mt-3 text-xs text-muted">Até {MAX_FILES} arquivos · .xlsx ou .xls · armazenamento local no navegador</p>
      </div>

      {cachedFiles.length ? (
        <section className="mt-5 rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Database className="size-4 text-accent" /><p className="text-sm font-semibold">Arquivos recentes ({cachedFiles.length}/{MAX_FILES})</p></div>
            <button disabled={!selectedCached.length} onClick={() => void reuseCached()} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Reutilizar selecionados</button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {cachedFiles.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-xl bg-panel-2 px-3 py-2">
                <input type="checkbox" checked={selectedCached.includes(item.id)} onChange={() => setSelectedCached((v) => v.includes(item.id) ? v.filter((id) => id !== item.id) : [...v, item.id])} />
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedCached((v) => v.includes(item.id) ? v.filter((id) => id !== item.id) : [...v, item.id])}>
                  <p className="truncate text-xs font-semibold">{item.name}</p><p className="text-[11px] text-muted">{(item.size / 1024 / 1024).toFixed(1)} MB</p>
                </button>
                <button title="Remover arquivo salvo" onClick={async () => { await deleteCachedFile(item.id); setSelectedCached((v) => v.filter((id) => id !== item.id)); await refreshCache(); }} className="rounded-md p-1.5 text-muted hover:bg-white hover:text-red-600"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {phase === "parsing" && progress ? <div className="mt-5 rounded-2xl border border-line bg-panel p-4"><ProgressBar percent={progress.percent} label={progressLabel(progress.phase)} /></div> : null}
      {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</div> : null}

      {parsed && (phase === "parsed" || phase === "analyzing" || phase === "ready") ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
          <div className="flex items-center justify-center gap-2"><Layers3 className="size-5 text-emerald-700" /><p className="font-semibold text-emerald-800">{loadedReports.length > 1 ? `${loadedReports.length} relatórios prontos para análise conjunta` : "Relatório pronto para análise"}</p></div>
          <p className="mt-2 text-xl font-semibold">{formatNumber(parsed.meta.rowCount)} execuções encontradas</p>
          {phase === "analyzing" && progress ? <div className="mx-auto mt-4 max-w-lg"><ProgressBar percent={progress.percent} label={progressLabel(progress.phase)} /></div> : (
            <button type="button" onClick={() => void analyze()} className="mt-4 min-w-56 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-800">Analisar relatório</button>
          )}
        </div>
      ) : null}

      {loadedReports.length ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{loadedReports.map((item) => <div key={item.fileName} className="rounded-xl border border-line bg-panel p-3"><p className="truncate text-xs font-semibold">{item.fileName}</p><p className="mt-1 text-xs text-muted">{item.detection.label} · {formatNumber(item.rowCount)} execuções</p></div>)}</div> : null}
      {warnings.map((warning) => <div key={warning} className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">{warning}</div>)}
    </div>
  );
}
