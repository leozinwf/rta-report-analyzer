import { FileSpreadsheet, Layers3, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressBar, progressLabel } from "../components/common/ProgressBar";
import { useReport } from "../context/ReportContext";
import { formatNumber } from "../utils/format";

export function UploadPage() {
  const { loadFiles, runAnalysis, phase, progress, parsed, loadedReports, error, warnings } = useReport();
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const selected = Array.from(files).filter((file) => /\.(xlsx|xls)$/i.test(file.name));
      if (!selected.length) return;
      await loadFiles(selected);
    },
    [loadFiles],
  );

  async function analyze() {
    await runAnalysis();
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Ferramenta interna de operação</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">RTA Report Analyzer</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Envie um relatório Automation, CRT Geral ou os dois juntos. O formato é identificado automaticamente e os arquivos podem ser analisados separadamente na identificação e combinados no diagnóstico.
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
        <p className="mt-4 text-lg font-medium">Arraste um ou mais relatórios Excel aqui</p>
        <p className="mt-1 text-sm text-muted">Você pode enviar Automation + CRT Geral ao mesmo tempo</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
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
        <p className="mt-4 text-xs text-muted">Formatos aceitos: .xlsx · .xls · processamento 100% local</p>
      </div>

      {phase === "parsing" && progress ? (
        <div className="mt-8 rounded-2xl border border-line bg-panel p-5">
          <ProgressBar percent={progress.percent} label={progressLabel(progress.phase)} />
        </div>
      ) : null}

      {error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loadedReports.length ? (
        <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <div className="flex items-center gap-2">
            <Layers3 className="size-5 text-accent" />
            <p className="font-semibold">Arquivos identificados</p>
          </div>
          <div className="mt-4 space-y-3">
            {loadedReports.map((item) => (
              <div key={item.fileName} className="rounded-xl border border-line bg-white/60 p-4 dark:bg-slate-950/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.fileName}</p>
                    <p className="mt-1 text-xs text-muted">{formatNumber(item.rowCount)} execuções</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
                <p className="mt-2 text-xs text-muted">
                  Confiança: {item.detection.confidence === "high" ? "alta" : item.detection.confidence === "medium" ? "média" : "baixa"}
                  {item.detection.evidence.length ? ` · identificado por: ${item.detection.evidence.join(", ")}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {warnings.map((warning) => (
        <div key={warning} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {warning}
        </div>
      ))}

      {parsed && (phase === "parsed" || phase === "analyzing" || phase === "ready") ? (
        <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <p className="text-sm font-semibold text-emerald-700">
            {loadedReports.length > 1 ? `${loadedReports.length} relatórios prontos para análise conjunta` : "Relatório carregado"}
          </p>
          <p className="mt-3 text-2xl font-semibold">{formatNumber(parsed.meta.rowCount)} execuções encontradas</p>
          <p className="mt-2 text-sm text-muted">
            {loadedReports.length > 1
              ? "Os registros dos arquivos foram normalizados para o mesmo formato e serão analisados em conjunto."
              : `${parsed.meta.columns.length} colunas identificadas · Aba: ${parsed.meta.analyzedSheet}`}
          </p>
          {phase === "analyzing" && progress ? (
            <div className="mt-5">
              <ProgressBar percent={progress.percent} label={progressLabel(progress.phase)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void analyze()}
              className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800"
            >
              {loadedReports.length > 1 ? "Analisar relatórios combinados" : "Analisar relatório"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
