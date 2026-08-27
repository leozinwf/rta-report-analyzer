import { FileSpreadsheet, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReport } from "../context/ReportContext";
import { formatNumber } from "../utils/format";
import { ProgressBar, progressLabel } from "../components/common/ProgressBar";

export function UploadPage() {
  const { loadFile, runAnalysis, phase, progress, parsed, error, warnings } = useReport();
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const onFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      await loadFile(file);
    },
    [loadFile],
  );

  async function analyze() {
    await runAnalysis();
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Ferramenta interna de operação</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">RTA Report Analyzer</h1>
      <p className="mt-3 max-w-xl text-muted">
        Leia relatórios Excel de execução de robôs RTA localmente no navegador e transforme milhares de linhas em diagnóstico operacional.
      </p>

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
        className={`mt-10 rounded-3xl border-2 border-dashed p-12 text-center transition ${
          dragOver ? "border-accent bg-accent/10" : "border-line bg-panel/80"
        }`}
      >
        <FileSpreadsheet className="mx-auto size-12 text-accent" />
        <p className="mt-4 text-lg font-medium">Arraste seu relatório Excel aqui</p>
        <p className="mt-1 text-sm text-muted">ou</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink hover:bg-cyan-300">
          <Upload className="size-4" />
          Selecionar arquivo
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              void onFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <p className="mt-4 text-xs text-muted">Formatos aceitos: .xlsx · .xls · processamento 100% local</p>
      </div>

      {phase === "parsing" && progress ? (
        <div className="mt-8 rounded-2xl border border-line bg-panel p-5">
          <ProgressBar percent={progress.percent} label={progressLabel(progress.phase)} />
        </div>
      ) : null}

      {error ? (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {warnings.map((warning) => (
        <div key={warning} className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          {warning}
        </div>
      ))}

      {parsed && (phase === "parsed" || phase === "analyzing" || phase === "ready") ? (
        <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <p className="text-sm font-semibold text-emerald-300">Relatório carregado</p>
          <p className="mt-3 text-2xl font-semibold">{formatNumber(parsed.meta.rowCount)} execuções encontradas</p>
          <p className="mt-2 text-sm text-muted">
            {parsed.meta.sheetNames.length} aba analisada · {parsed.meta.columns.length} colunas identificadas
          </p>
          <p className="mt-1 text-xs text-muted">Aba: {parsed.meta.analyzedSheet}</p>
          {phase === "analyzing" && progress ? (
            <div className="mt-5">
              <ProgressBar percent={progress.percent} label={progressLabel(progress.phase)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void analyze()}
              className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink hover:bg-cyan-300"
            >
              Analisar relatório
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
