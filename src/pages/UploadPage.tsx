import { ArrowRight, CheckCircle2, Database, FileCheck2, FileSpreadsheet, Layers3, LoaderCircle, Search, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressBar, progressLabel } from "../components/common/ProgressBar";
import { useReport } from "../context/ReportContext";
import { deleteSavedReport, listSavedReports, loadSavedReport, saveReportFiles, type SavedReportFile } from "../services/reports/storage";
import { formatNumber } from "../utils/format";

export function UploadPage() {
  const { loadFiles, runAnalysis, phase, progress, parsed, loadedReports, error, warnings } = useReport();
  const [dragOver, setDragOver] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReportFile[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<string[]>([]);
  const [savedQuery, setSavedQuery] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  const [reusing, setReusing] = useState(false);
  const navigate = useNavigate();

  const refreshSavedReports = useCallback(async () => {
    try {
      setSavedReports(await listSavedReports());
    } catch {
      setSavedReports([]);
      setStorageMessage("O navegador não permitiu acessar os relatórios salvos.");
    }
  }, []);

  useEffect(() => {
    void refreshSavedReports();
  }, [refreshSavedReports]);

  const visibleSavedReports = useMemo(() => {
    const query = savedQuery.trim().toLowerCase();
    return query ? savedReports.filter((item) => item.name.toLowerCase().includes(query)) : savedReports;
  }, [savedQuery, savedReports]);

  const onFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files?.length) return;
      const selected = Array.from(files).filter((file) => /\.(xlsx|xls)$/i.test(file.name));
      if (!selected.length) return;
      setStorageMessage("");
      try {
        await saveReportFiles(selected);
        await refreshSavedReports();
      } catch {
        setStorageMessage("Os arquivos serão analisados, mas não foi possível salvá-los no navegador. Verifique o espaço disponível.");
      }
      await loadFiles(selected);
    },
    [loadFiles, refreshSavedReports],
  );

  async function reuseSavedReports() {
    if (!selectedSaved.length) return;
    setReusing(true);
    setStorageMessage("");
    try {
      const files = (await Promise.all(selectedSaved.map((id) => loadSavedReport(id)))).filter(Boolean) as File[];
      if (files.length) await loadFiles(files);
      else setStorageMessage("Os relatórios selecionados não estão mais disponíveis no navegador.");
    } catch {
      setStorageMessage("Não foi possível reutilizar os relatórios selecionados.");
    } finally {
      setReusing(false);
    }
  }

  async function removeSavedReport(id: string) {
    try {
      await deleteSavedReport(id);
      setSelectedSaved((current) => current.filter((item) => item !== id));
      await refreshSavedReports();
    } catch {
      setStorageMessage("Não foi possível remover o relatório salvo.");
    }
  }

  async function analyze() {
    await runAnalysis();
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl py-2 sm:py-4">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Nova análise</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Prepare seus relatórios</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Envie Automation, CRT Geral ou os dois juntos. A ferramenta reconhece cada formato e reúne os dados automaticamente.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
          <ShieldCheck className="size-4" />
          Processamento local e seguro
        </div>
      </section>

      {phase === "parsing" && progress ? (
        <section className="mt-5 overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-accent"><LoaderCircle className="size-5 animate-spin" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-cyan-950">Lendo e preparando os relatórios</p>
              <p className="mt-1 text-sm text-cyan-900/70">Aguarde enquanto identificamos os arquivos e normalizamos as execuções.</p>
              <div className="mt-4"><ProgressBar percent={progress.percent} label={progressLabel(progress.phase)} /></div>
            </div>
          </div>
        </section>
      ) : null}

      {parsed && (phase === "parsed" || phase === "analyzing" || phase === "ready") ? (
        <section className="mt-5 flex flex-col gap-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${phase === "analyzing" ? "bg-cyan-100 text-accent" : "bg-emerald-100 text-emerald-700"}`}>
              {phase === "analyzing" ? <LoaderCircle className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
            </span>
            <div>
              <p className={`text-sm font-semibold ${phase === "analyzing" ? "text-cyan-900" : "text-emerald-800"}`}>
                {phase === "analyzing"
                  ? "Analisando os relatórios…"
                  : loadedReports.length > 1
                    ? `${loadedReports.length} relatórios prontos para análise conjunta`
                    : "Relatório pronto para análise"}
              </p>
              <p className="mt-1 text-2xl font-semibold">{formatNumber(parsed.meta.rowCount)} execuções</p>
              <p className="mt-1 text-sm text-muted">
                {phase === "analyzing"
                  ? "Calculando indicadores, recorrências e concentrações."
                  : loadedReports.length > 1
                    ? "Os registros foram normalizados e serão analisados em conjunto."
                    : `${parsed.meta.columns.length} colunas identificadas · Aba: ${parsed.meta.analyzedSheet}`}
              </p>
            </div>
          </div>
          {phase === "analyzing" && progress ? (
            <div className="w-full sm:max-w-sm">
              <ProgressBar percent={progress.percent} label={progressLabel(progress.phase)} />
              <p className="mt-2 text-right text-xs text-muted">Não feche esta página.</p>
            </div>
          ) : (
            <button type="button" onClick={() => void analyze()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800">
              {loadedReports.length > 1 ? "Analisar relatórios combinados" : "Analisar relatório"}
              <ArrowRight className="size-4" />
            </button>
          )}
        </section>
      ) : null}

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void onFiles(event.dataTransfer.files);
          }}
          className={`flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragOver ? "border-accent bg-cyan-50" : "border-slate-300 bg-panel hover:border-accent/60"
          }`}
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-cyan-50 text-accent">
            <FileSpreadsheet className="size-7" />
          </span>
          <p className="mt-5 text-lg font-semibold">Solte os arquivos Excel aqui</p>
          <p className="mt-1 max-w-sm text-sm leading-5 text-muted">Selecione um ou mais relatórios. Automation e CRT Geral podem ser enviados juntos.</p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800">
            <Upload className="size-4" />
            Selecionar arquivos
            <input
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              onChange={(event) => {
                void onFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <p className="mt-4 text-xs text-muted">Formatos aceitos: .xlsx e .xls</p>
        </div>

        <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers3 className="size-5 text-accent" />
              <h2 className="font-semibold">Arquivos identificados</h2>
            </div>
            {loadedReports.length ? (
              <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs font-semibold text-muted">{loadedReports.length}</span>
            ) : null}
          </div>

          {loadedReports.length ? (
            <div className="mt-4 space-y-3">
              {loadedReports.map((item) => (
                <div key={item.fileName} className="rounded-xl border border-line bg-panel-2 p-4">
                  <div className="flex items-start gap-3">
                    <FileCheck2 className="mt-0.5 size-5 shrink-0 text-success" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" title={item.fileName}>{item.fileName}</p>
                      <p className="mt-1 text-xs text-muted">{formatNumber(item.rowCount)} execuções</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.detection.kind === "automation"
                          ? "bg-blue-100 text-blue-800"
                          : item.detection.kind === "crt"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.detection.label}
                    </span>
                  </div>
                  <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
                    Confiança {item.detection.confidence === "high" ? "alta" : item.detection.confidence === "medium" ? "média" : "baixa"}
                    {item.detection.evidence.length ? ` · ${item.detection.evidence.slice(0, 3).join(", ")}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex min-h-52 flex-col justify-center rounded-xl bg-panel-2 p-5">
              <p className="text-sm font-medium">O que acontece depois do envio?</p>
              <ol className="mt-4 space-y-4 text-sm text-muted">
                <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-accent">1</span><span>Identificamos o tipo de cada relatório.</span></li>
                <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-accent">2</span><span>Normalizamos os registros no mesmo formato.</span></li>
                <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-accent">3</span><span>Você confirma antes de iniciar a análise.</span></li>
              </ol>
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-accent"><Database className="size-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">Relatórios salvos neste navegador</h2>
                <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs font-semibold text-muted">{savedReports.length}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">Ficam disponíveis somente neste navegador até você removê-los ou limpar os dados do site.</p>
            </div>
          </div>
          <button type="button" disabled={!selectedSaved.length || reusing} onClick={() => void reuseSavedReports()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-40">
            <FileSpreadsheet className="size-4" />
            {reusing ? "Carregando…" : `Reutilizar selecionados${selectedSaved.length ? ` (${selectedSaved.length})` : ""}`}
          </button>
        </div>

        {savedReports.length ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" />
                <input value={savedQuery} onChange={(event) => setSavedQuery(event.target.value)} placeholder="Buscar relatório salvo…" className="w-full rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none focus:border-accent" />
              </label>
              <button type="button" onClick={() => setSelectedSaved((current) => visibleSavedReports.every((item) => current.includes(item.id)) ? current.filter((id) => !visibleSavedReports.some((item) => item.id === id)) : [...new Set([...current, ...visibleSavedReports.map((item) => item.id)])])} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-panel-2">
                {visibleSavedReports.length && visibleSavedReports.every((item) => selectedSaved.includes(item.id)) ? "Desmarcar visíveis" : "Selecionar visíveis"}
              </button>
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-line">
              {visibleSavedReports.map((item) => (
                <div key={item.id} className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-b-0 hover:bg-panel-2/60">
                  <input type="checkbox" checked={selectedSaved.includes(item.id)} onChange={() => setSelectedSaved((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className="size-4 accent-cyan-700" />
                  <button type="button" onClick={() => setSelectedSaved((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold" title={item.name}>{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{(item.size / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB · salvo em {new Date(item.savedAt).toLocaleString("pt-BR")}</p>
                  </button>
                  <button type="button" title="Remover relatório salvo" aria-label={`Remover ${item.name}`} onClick={() => void removeSavedReport(item.id)} className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-danger"><Trash2 className="size-4" /></button>
                </div>
              ))}
              {!visibleSavedReports.length ? <p className="px-4 py-8 text-center text-sm text-muted">Nenhum relatório encontrado.</p> : null}
            </div>
            <p className="mt-3 text-[11px] text-muted">A aplicação não define limite de quantidade. O armazenamento disponível depende do navegador e do dispositivo.</p>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-line bg-panel-2/60 px-4 py-6 text-center text-sm text-muted">Os relatórios importados aparecerão aqui automaticamente.</div>
        )}
      </section>

      {storageMessage ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{storageMessage}</div> : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {warnings.filter((warning) => !/relatórios foram combinados em uma única análise/i.test(warning)).map((warning) => (
        <div key={warning} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {warning}
        </div>
      ))}

    </div>
  );
}
